/**
 * PharmaTech — Enterprise Offline Synchronization Engine (ADR-011 / R1-A1)
 *
 * Implements the Durable Outbox Pattern for Point-of-Sale (POS) offline continuity:
 * 1. Guarantees zero data loss during network disruptions by persisting offline sales to durable storage.
 * 2. Enforces Idempotency Keys (UUIDv7/UUIDv4) to prevent duplicate transactions on network reconnect.
 * 3. Provides sequential FIFO synchronization with explicit conflict containment (A2-REF-02).
 * 4. Automatically triggers synchronization upon network restoration via Navigator Online events.
 */

import { apiClient } from './apiClient.js';
import { MedicineService } from './medicineService.js';
import { showToast } from '../components/Toast.js';

const STORAGE_KEY = 'pharmatech_pos_offline_outbox_v1';
const SYNCED_ARCHIVE_KEY = 'pharmatech_pos_offline_synced_v1';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return '018f' + 'xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export class OfflineSyncService {
  constructor() {
    this.queue = this.loadQueue();
    this.isSyncing = false;
    this.lastSyncTimestamp = null;

    this.initNetworkListeners();
  }

  /**
   * Loads pending offline queue from durable local storage.
   * @returns {Array<object>}
   */
  loadQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to read outbox from localStorage:', err);
    }
    return [];
  }

  /**
   * Persists current queue to durable storage.
   */
  persistQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      }
    } catch (err) {
      console.error('[OfflineSyncService] Failed to write outbox to localStorage:', err);
    }
  }

  /**
   * Sets up automatic sync triggers on network recovery.
   */
  initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[OfflineSyncService] 🌐 Network online event detected. Initiating auto-sync...');
      showToast('تمت استعادة الاتصال بالإنترنت 🌐', 'جاري إرسال الفواتير المحفوظة وتحديث الحسابات تلقائياً...', 'info');
      this.syncQueue({ silent: false, autoTriggered: true });
    });
  }

  /**
   * Returns all items currently in the outbox.
   */
  getQueue() {
    return [...this.queue];
  }

  /**
   * Returns count of transactions pending synchronization.
   */
  getPendingCount() {
    return this.queue.filter(item => item.status === 'PENDING' || item.status === 'CONFLICT').length;
  }

  /**
   * Enqueues an offline sale into the durable outbox.
   *
   * @param {object} params
   * @param {object} params.dto - The CompleteSaleRequestDto payload
   * @param {object} params.responseDto - The temporary offline response displayed to the cashier
   * @param {object} params.session - Cashier and register context
   * @returns {object} The queued outbox item
   */
  enqueueOfflineSale({ dto, responseDto, session }) {
    const idempotencyKey = generateUUID();
    const correlationId = `offline-corr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const outboxItem = {
      id: generateUUID(),
      idempotencyKey,
      correlationId,
      createdAt: new Date().toISOString(),
      offlineInvoiceNumber: responseDto.invoice_number,
      cashierId: session.cashierId,
      cashierName: session.cashierName,
      branchId: session.branchId || 'brn-khartoum-01',
      cashRegisterId: session.cashRegisterId,
      cashSessionId: session.cashSessionId,
      dto,
      totals: responseDto.totals,
      itemsSummary: responseDto.items || [],
      paymentsSummary: dto.payments || [],
      status: 'PENDING', // PENDING | SYNCING | SYNCED | CONFLICT
      attempts: 0,
      lastAttemptAt: null,
      errorMessage: null,
      serverInvoiceNumber: null
    };

    this.queue.push(outboxItem);
    this.persistQueue();

    this.notifyQueueChanged();
    return outboxItem;
  }

  /**
   * Synchronizes all pending items sequentially with the Core Backend.
   *
   * @param {object} options
   * @param {boolean} [options.silent=false] - Suppress toasts for background tasks
   * @param {boolean} [options.autoTriggered=false] - Whether triggered by online event
   * @returns {Promise<{ total: number, synced: number, failed: number }>}
   */
  async syncQueue(options = { silent: false, autoTriggered: false }) {
    if (this.isSyncing) {
      console.warn('[OfflineSyncService] Sync already in progress.');
      return { total: this.queue.length, synced: 0, failed: 0 };
    }

    const pendingItems = this.queue.filter(i => i.status === 'PENDING' || i.status === 'CONFLICT');
    if (pendingItems.length === 0) {
      if (!options.silent && !options.autoTriggered) {
        showToast('طابور المزامنة فارغ', 'جميع الفواتير متزامنة ومسجلة في السحابة بنسبة 100% ☁️', 'success');
      }
      return { total: 0, synced: 0, failed: 0 };
    }

    // Ping backend health to ensure real connectivity (avoiding captive portals / false online)
    const isServerReachable = await this.pingHealth();
    if (!isServerReachable) {
      if (!options.silent) {
        showToast('تعذر الوصول للخادم', 'الشبكة غير مستقرة أو الخادم غير متاح حالياً. سيتم حفظ الفواتير بأمان محلياً.', 'warning');
      }
      return { total: pendingItems.length, synced: 0, failed: pendingItems.length };
    }

    this.isSyncing = true;
    this.notifyQueueChanged();

    let syncedCount = 0;
    let failedCount = 0;

    for (const item of pendingItems) {
      item.status = 'SYNCING';
      item.attempts += 1;
      item.lastAttemptAt = new Date().toISOString();
      this.persistQueue();
      this.notifyQueueChanged();

      try {
        const headers = {
          'Idempotency-Key': item.idempotencyKey,
          'X-Correlation-Id': item.correlationId
        };

        // Post to official backend CompleteSale endpoint
        const serverResult = await apiClient.post('/api/sales', item.dto, headers);

        item.status = 'SYNCED';
        item.serverInvoiceNumber = serverResult.invoice_number || serverResult.invoiceNumber;
        item.errorMessage = null;
        syncedCount += 1;

        // Archive synced item
        this.archiveSyncedItem(item);
      } catch (err) {
        console.error(`[OfflineSyncService] Error syncing item ${item.offlineInvoiceNumber}:`, err);
        const msg = String(err.message || '');
        const isConflict = msg.includes('BATCH_EXPIRED') ||
                           msg.includes('INSUFFICIENT_BATCH_STOCK') ||
                           msg.includes('BUSINESS_RULE_VIOLATION') ||
                           msg.includes('NO_VALID_STOCK');

        item.status = isConflict ? 'CONFLICT' : 'PENDING';
        item.errorMessage = err.message || 'خطأ غير معروف في الاتصال';
        failedCount += 1;
      }
    }

    // Remove fully SYNCED items from the active outbox
    this.queue = this.queue.filter(i => i.status !== 'SYNCED');
    this.persistQueue();

    this.isSyncing = false;
    this.lastSyncTimestamp = new Date().toISOString();

    // Trigger authoritative backend updates across the ERP
    try {
      await MedicineService.fetchFromBackend();
    } catch {}

    window.dispatchEvent(new CustomEvent('SALES_UPDATED'));
    window.dispatchEvent(new CustomEvent('SESSION_UPDATED'));
    window.dispatchEvent(new CustomEvent('ALLOCATION_UPDATED'));
    this.notifyQueueChanged();

    // Feedback to user
    if (!options.silent) {
      if (syncedCount > 0 && failedCount === 0) {
        showToast(
          'اكتمل إرسال الفواتير بنجاح ☁️',
          `تم إرسال ${syncedCount} فواتير وتحديث الأرصدة والمخزون بالكامل`,
          'success'
        );
      } else if (syncedCount > 0 && failedCount > 0) {
        showToast(
          'إرسال جزئي للفواتير',
          `تم إرسال ${syncedCount} فواتير، وتعذر إرسال ${failedCount} (يرجى مراجعة القائمة)`,
          'warning'
        );
      } else if (failedCount > 0) {
        showToast(
          'فشلت مزامنة الفواتير',
          `تعذر ترحيل ${failedCount} فاتورة إلى السحابة. تحقق من حالة الاتصال وقواعد الصرف.`,
          'danger'
        );
      }
    }

    return { total: pendingItems.length, synced: syncedCount, failed: failedCount };
  }

  /**
   * Synchronizes a single item by its Outbox ID.
   * @param {string} outboxId
   */
  async syncSingleItem(outboxId) {
    const item = this.queue.find(i => i.id === outboxId);
    if (!item) return false;

    item.status = 'SYNCING';
    item.attempts += 1;
    item.lastAttemptAt = new Date().toISOString();
    this.persistQueue();
    this.notifyQueueChanged();

    try {
      const headers = {
        'Idempotency-Key': item.idempotencyKey,
        'X-Correlation-Id': item.correlationId
      };

      const serverResult = await apiClient.post('/api/sales', item.dto, headers);
      item.status = 'SYNCED';
      item.serverInvoiceNumber = serverResult.invoice_number || serverResult.invoiceNumber;
      item.errorMessage = null;

      this.archiveSyncedItem(item);
      this.queue = this.queue.filter(i => i.id !== outboxId);
      this.persistQueue();

      await MedicineService.fetchFromBackend();
      window.dispatchEvent(new CustomEvent('SALES_UPDATED'));
      window.dispatchEvent(new CustomEvent('SESSION_UPDATED'));
      this.notifyQueueChanged();

      showToast(
        'تمت المزامنة بنجاح',
        `تم اعتماد الفاتورة ${item.serverInvoiceNumber} بالسحابة`,
        'success'
      );
      return true;
    } catch (err) {
      console.error(`[OfflineSyncService] Failed to sync ${item.offlineInvoiceNumber}:`, err);
      item.status = 'CONFLICT';
      item.errorMessage = err.message;
      this.persistQueue();
      this.notifyQueueChanged();

      showToast('خطأ في المزامنة', err.message, 'danger');
      return false;
    }
  }

  /**
   * Removes an item from the outbox (Manager override only).
   * @param {string} outboxId
   */
  discardItem(outboxId) {
    const item = this.queue.find(i => i.id === outboxId);
    if (!item) return;

    this.queue = this.queue.filter(i => i.id !== outboxId);
    this.persistQueue();
    this.notifyQueueChanged();

    showToast('تم حذف الفاتورة المعلقة', `تم إلغاء ${item.offlineInvoiceNumber} من طابور المزامنة`, 'info');
  }

  /**
   * Pings the server health endpoint to confirm real internet/API reachability.
   * @returns {Promise<boolean>}
   */
  async pingHealth() {
    try {
      const res = await apiClient.get('/api/health');
      return res && res.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Keeps an archival copy of synced items in localStorage for audit & traceability.
   */
  archiveSyncedItem(item) {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(SYNCED_ARCHIVE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({
        ...item,
        syncedAt: new Date().toISOString()
      });
      // Keep last 100 historical records
      localStorage.setItem(SYNCED_ARCHIVE_KEY, JSON.stringify(list.slice(0, 100)));
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to write to sync archive:', err);
    }
  }

  /**
   * Emits reactive event for UI components.
   */
  notifyQueueChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('OFFLINE_QUEUE_UPDATED', {
          detail: {
            pendingCount: this.getPendingCount(),
            isSyncing: this.isSyncing,
            queue: this.getQueue(),
            lastSyncTimestamp: this.lastSyncTimestamp
          }
        })
      );
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
