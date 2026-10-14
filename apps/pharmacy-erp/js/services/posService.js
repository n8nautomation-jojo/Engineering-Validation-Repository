/**
 * PharmaTech — Enterprise Integrated Point of Sale (POS) Service
 * Conforms strictly to PosViewModel (src/presentation/pos-view-model.ts) and OpenAPI 3.1 DTOs
 */

import { apiClient } from './apiClient.js';
import { MedicineService } from './medicineService.js';
import { AuthService } from './authService.js';
import { offlineSyncService } from './offlineSyncService.js';

class PosService {
  constructor() {
    this.cart = [];
    this.payments = [];
    this.activePaymentMethod = 'BANKAK'; // Default in Sudan
    this.bankakReference = '';
    this.isOffline = false;
    this.isSplitMode = false;
    this.splitCashAmount = 0;
    this.splitBankakAmount = 0;
    this.splitBankakRef = '';

    const activeUser = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
    this.session = {
      cashRegisterId: '018f0000-0000-7000-8000-000000000001',
      cashSessionId: '018f0000-0000-7000-8000-000000000002',
      cashierId: activeUser?.id || 'usr-001',
      cashierName: activeUser?.fullName || 'د. سارة الكباشي',
      branchId: 'brn-khartoum-01'
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('AUTH_STATE_CHANGED', (e) => {
        const user = e.detail?.user;
        if (user) {
          this.session.cashierId = user.id;
          this.session.cashierName = user.fullName;
        }
      });
    }

    this.allocation = {
      deviceId: 'pos-dev-01',
      totalCapacity: 100,
      consumedCapacity: 20
    };

    this.loadBackendContext();
  }

  async loadBackendContext() {
    try {
      const [sessionData, allocData] = await Promise.all([
        apiClient.get('/api/session/current'),
        apiClient.get('/api/allocation/status')
      ]);

      if (sessionData) {
        const activeUser = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        this.session = {
          cashRegisterId: sessionData.cashRegisterId,
          cashSessionId: sessionData.cashSessionId,
          cashierId: activeUser?.id || sessionData.cashierId,
          cashierName: activeUser?.fullName || sessionData.cashierName,
          branchId: sessionData.branchId
        };
      }

      if (allocData) {
        this.allocation = {
          deviceId: allocData.deviceId,
          totalCapacity: allocData.totalCapacity,
          consumedCapacity: allocData.consumedCapacity
        };
        this.updateAllocationMeterUI();
      }
    } catch (err) {
      console.warn('[PosService] Backend context sync warning:', err.message);
    }
  }

  get allocationRemaining() {
    return Math.max(0, this.allocation.totalCapacity - this.allocation.consumedCapacity);
  }

  get subtotal() {
    return Number(this.cart.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  }

  get tax() {
    return 0.00; // Zero-rated for medicines in Sudan
  }

  get grandTotal() {
    return this.subtotal;
  }

  get totalPaid() {
    return Number(this.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2));
  }

  get remainingBalance() {
    return Math.max(0, Number((this.grandTotal - this.totalPaid).toFixed(2)));
  }

  selectFefoBatch(product) {
    if (!product.batches || product.batches.length === 0) {
      return {
        batchNumber: product.batch || 'BATCH-GEN-01',
        expiryDate: product.expiry || '2027-12-31',
        availableQuantity: product.stock || 100
      };
    }
    const today = new Date().toISOString().split('T')[0];
    const validBatches = product.batches
      .filter(b => b.availableQuantity > 0 && b.expiryDate >= today)
      .slice()
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    return validBatches[0] || null;
  }

  addItem(product, preferredBatch, quantity = 1) {
    if (quantity <= 0) throw new Error('QUANTITY_MUST_BE_POSITIVE');

    let batch = null;
    if (preferredBatch && product.batches) {
      batch = product.batches.find(b => b.batchNumber === preferredBatch) || null;
    } else {
      batch = this.selectFefoBatch(product);
    }

    if (!batch) {
      throw new Error(`NO_VALID_STOCK: الصنف ${product.name} ليس به تشغيلة صالحة وغير منتهية الصلاحية`);
    }

    const today = new Date().toISOString().split('T')[0];
    if (batch.expiryDate < today) {
      throw new Error(`BATCH_EXPIRED: التشغيلة ${batch.batchNumber} منتهية الصلاحية بتاريخ ${batch.expiryDate} ومحظورة نهائياً`);
    }

    // Offline allocation check
    if (this.isOffline) {
      const currentCartTotalUnits = this.cart.reduce((sum, item) => sum + item.quantity, 0);
      if (currentCartTotalUnits + quantity > this.allocationRemaining) {
        throw new Error(`OFFLINE_ALLOCATION_EXHAUSTED: تجاوزت الحصة المتبقية للعمل بدون إنترنت (${this.allocationRemaining} وحدة)`);
      }
    }

    const existingIndex = this.cart.findIndex(
      item => item.productId === product.id && item.batchNumber === batch.batchNumber
    );

    const existingQty = existingIndex >= 0 ? this.cart[existingIndex].quantity : 0;
    const targetQty = existingQty + quantity;

    if (targetQty > batch.availableQuantity) {
      throw new Error(`INSUFFICIENT_BATCH_STOCK: الكمية المتوفرة في التشغيلة ${batch.batchNumber} هي ${batch.availableQuantity} عبوة فقط`);
    }

    const lineTotal = Number((targetQty * product.price).toFixed(2));
    const newItem = {
      productId: product.id,
      name: product.nameAr || product.name,
      nameAr: product.nameAr || product.name,
      generic: product.generic || product.name,
      sku: product.sku || `SKU-${product.id}`,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      unitPrice: Number(product.price),
      quantity: targetQty,
      lineTotal
    };

    if (existingIndex >= 0) {
      this.cart[existingIndex] = newItem;
    } else {
      this.cart.push(newItem);
    }

    return newItem;
  }

  updateQuantity(index, quantity) {
    if (index < 0 || index >= this.cart.length) return;
    if (quantity <= 0) {
      this.cart.splice(index, 1);
    } else {
      this.cart[index].quantity = quantity;
      this.cart[index].lineTotal = Number((quantity * this.cart[index].unitPrice).toFixed(2));
    }
  }

  removeItem(index) {
    if (index >= 0 && index < this.cart.length) {
      this.cart.splice(index, 1);
    }
  }

  clearCart() {
    this.cart = [];
    this.payments = [];
    this.bankakReference = '';
    this.splitCashAmount = 0;
    this.splitBankakAmount = 0;
    this.splitBankakRef = '';
  }

  setSplitMode(active) {
    this.isSplitMode = Boolean(active);
    if (this.isSplitMode) {
      this.splitHalfAndHalf();
    }
  }

  splitHalfAndHalf() {
    const total = this.grandTotal;
    const half = Math.round(total / 2);
    this.splitCashAmount = half;
    this.splitBankakAmount = Math.max(0, total - half);
  }

  setSplitAmounts(cash, bankak, ref) {
    this.splitCashAmount = Number(cash || 0);
    this.splitBankakAmount = Number(bankak || 0);
    if (ref !== undefined) this.splitBankakRef = ref;
  }

  toggleOfflineMode(forceState = null) {
    this.isOffline = forceState !== null ? forceState : !this.isOffline;
    return this.isOffline;
  }

  addPayment(method, amount, reference = '', verificationMode = 'EVIDENCE_REVIEW') {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    this.payments.push({
      method: method === 'BANKAK' ? 'BANK_TRANSFER' : method,
      amount: numAmount,
      reference,
      verificationMode: method === 'CASH' ? 'MANUAL_CONFIRMATION' : verificationMode,
      timestamp: new Date().toISOString()
    });
  }

  clearPayments() {
    this.payments = [];
  }

  validateForCompletion() {
    if (this.cart.length === 0) {
      return { valid: false, reason: 'السلة فارغة. يرجى إضافة أدوية أولاً.' };
    }

    if (this.isSplitMode) {
      const totalPaid = Number((this.splitCashAmount + this.splitBankakAmount).toFixed(2));
      if (Math.abs(totalPaid - this.grandTotal) > 0.01) {
        return {
          valid: false,
          reason: `مجموع السداد المجزأ (${totalPaid.toLocaleString()} ج.س) لا يطابق إجمالي الفاتورة (${this.grandTotal.toLocaleString()} ج.س)`
        };
      }
    }

    return { valid: true };
  }

  toCompleteSaleRequestDto(customerId) {
    const validation = this.validateForCompletion();
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    let paymentInputs = [];
    if (this.isSplitMode) {
      const cashVal = Number(this.splitCashAmount || 0);
      const bankakVal = Number(this.splitBankakAmount || 0);

      if (cashVal > 0) {
        paymentInputs.push({
          method: 'CASH',
          amount: cashVal,
          verificationMode: 'MANUAL_CONFIRMATION'
        });
      }
      if (bankakVal > 0) {
        paymentInputs.push({
          method: 'BANK_TRANSFER',
          amount: bankakVal,
          reference: this.splitBankakRef || `TXN-BOK-${Math.floor(10000000 + Math.random() * 90000000)}`,
          verificationMode: 'EVIDENCE_REVIEW'
        });
      }
    } else {
      let activeInputs = [...this.payments];
      if (activeInputs.length === 0) {
        const isBankak = this.activePaymentMethod === 'BANKAK';
        activeInputs = [
          {
            method: isBankak ? 'BANK_TRANSFER' : this.activePaymentMethod,
            amount: this.grandTotal,
            reference: isBankak ? (this.bankakReference || `TXN-BOK-${Math.floor(10000000 + Math.random() * 90000000)}`) : undefined,
            verificationMode: isBankak ? 'EVIDENCE_REVIEW' : 'MANUAL_CONFIRMATION'
          }
        ];
      }
      paymentInputs = activeInputs;
    }

    const lines = this.cart.map(item => ({
      product_id: item.productId,
      batch_id: item.batchNumber,
      quantity: { value: item.quantity.toString(), unit_code: 'EA' },
      unit_price: { value: item.unitPrice.toFixed(2), currency: 'SDG' }
    }));

    const payments = paymentInputs.map(p => ({
      method: p.method,
      amount: { value: p.amount.toFixed(2), currency: 'SDG' },
      ...(p.verificationMode ? { verification_mode: p.verificationMode } : {}),
      ...(p.reference ? { evidence_reference: p.reference } : {})
    }));

    return {
      cash_register_id: this.session.cashRegisterId,
      cash_session_id: this.session.cashSessionId,
      lines,
      payments,
      ...(customerId ? { customer_id: customerId } : {})
    };
  }

  /**
   * Commits the sale officially to the Core Backend API
   * Deducts batch stock, updates allocation, and returns CompleteSaleResponseDto
   */
  async completeSale(customerId) {
    const dto = this.toCompleteSaleRequestDto(customerId);

    // If in simulated or actual offline mode
    if (this.isOffline) {
      const totalUnits = this.cart.reduce((sum, item) => sum + item.quantity, 0);
      this.allocation.consumedCapacity = Math.min(this.allocation.totalCapacity, this.allocation.consumedCapacity + totalUnits);
      this.updateAllocationMeterUI();

      const invNo = `INV-OFFL-${Date.now().toString().slice(-6)}`;
      const responseDto = {
        sale_id: `offline-${Date.now()}`,
        invoice_number: invNo,
        created_at: new Date().toISOString(),
        cashier_name: this.session.cashierName,
        totals: {
          subtotal: this.subtotal.toFixed(2),
          total: this.grandTotal.toFixed(2),
          currency: 'SDG'
        },
        items: this.cart.map(i => ({
          name: i.name,
          nameAr: i.nameAr,
          batchNumber: i.batchNumber,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal
        })),
        lines: this.cart.map(i => ({ ...i, quantity: { value: i.quantity.toString() } })),
        payments: dto.payments,
        offline_sync: 'QUEUED'
      };

      // Enqueue to durable outbox for guaranteed synchronization
      offlineSyncService.enqueueOfflineSale({
        dto,
        responseDto,
        session: this.session
      });

      // Deduct from local cache
      for (const item of this.cart) {
        const med = MedicineService.getById(item.productId);
        if (med) {
          med.stock = Math.max(0, med.stock - item.quantity);
        }
      }

      this.clearCart();
      return responseDto;
    }

    try {
      // Standard Online Mode via Backend API with Idempotency Key
      const responseDto = await apiClient.post('/api/sales', dto);

      // Synchronize local inventory from backend to update all views & badges
      await MedicineService.fetchFromBackend();

      // Refresh allocation
      await this.loadBackendContext();

      // Notify all interconnected components (Dashboard, Sales, Sessions)
      window.dispatchEvent(new CustomEvent('SALES_UPDATED'));
      window.dispatchEvent(new CustomEvent('SESSION_UPDATED'));

      // Clear cart after successful transaction
      this.clearCart();

      return responseDto;
    } catch (err) {
      // If network failure / connection lost unexpectedly during sale, fall back gracefully to offline outbox!
      const isNetworkError = (typeof navigator !== 'undefined' && !navigator.onLine) ||
                             err.message?.includes('NetworkError') ||
                             err.message?.includes('Failed to fetch') ||
                             err.message?.includes('Load failed');

      if (isNetworkError) {
        console.warn('[PosService] Network failure during online checkout. Falling back to offline outbox...');
        this.isOffline = true;
        const totalUnits = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        this.allocation.consumedCapacity = Math.min(this.allocation.totalCapacity, this.allocation.consumedCapacity + totalUnits);
        this.updateAllocationMeterUI();

        const invNo = `INV-OFFL-${Date.now().toString().slice(-6)}`;
        const fallbackResponse = {
          sale_id: `offline-${Date.now()}`,
          invoice_number: invNo,
          created_at: new Date().toISOString(),
          cashier_name: this.session.cashierName,
          totals: {
            subtotal: this.subtotal.toFixed(2),
            total: this.grandTotal.toFixed(2),
            currency: 'SDG'
          },
          items: this.cart.map(i => ({
            name: i.name,
            nameAr: i.nameAr,
            batchNumber: i.batchNumber,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal
          })),
          lines: this.cart.map(i => ({ ...i, quantity: { value: i.quantity.toString() } })),
          payments: dto.payments,
          offline_sync: 'QUEUED'
        };

        offlineSyncService.enqueueOfflineSale({
          dto,
          responseDto: fallbackResponse,
          session: this.session
        });

        for (const item of this.cart) {
          const med = MedicineService.getById(item.productId);
          if (med) {
            med.stock = Math.max(0, med.stock - item.quantity);
          }
        }

        this.clearCart();
        return fallbackResponse;
      }

      throw err;
    }
  }

  updateAllocationMeterUI() {
    const barFill = document.getElementById('allocation-meter-bar-fill');
    const valText = document.getElementById('allocation-meter-val');
    if (barFill && valText) {
      const remaining = this.allocationRemaining;
      const total = this.allocation.totalCapacity;
      const percent = Math.round((remaining / total) * 100);
      barFill.style.width = `${percent}%`;
      valText.textContent = `${remaining} / ${total} وحدة`;
    }
  }
}

export const posService = new PosService();
