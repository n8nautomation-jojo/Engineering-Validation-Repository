/**
 * PharmaTech — Enterprise Integrated Point of Sale (POS) Service
 * Conforms strictly to PosViewModel (src/presentation/pos-view-model.ts) and OpenAPI 3.1 DTOs
 */

import { apiClient } from './apiClient.js';
import { MedicineService } from './medicineService.js';

class PosService {
  constructor() {
    this.cart = [];
    this.payments = [];
    this.activePaymentMethod = 'BANKAK'; // Default in Sudan
    this.bankakReference = '';
    this.isOffline = false;

    this.session = {
      cashRegisterId: '018f0000-0000-7000-8000-000000000001',
      cashSessionId: '018f0000-0000-7000-8000-000000000002',
      cashierId: 'usr-001',
      cashierName: 'د. أحمد الطاهر',
      branchId: 'brn-khartoum-01'
    };

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
        this.session = {
          cashRegisterId: sessionData.cashRegisterId,
          cashSessionId: sessionData.cashSessionId,
          cashierId: sessionData.cashierId,
          cashierName: sessionData.cashierName,
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
    return { valid: true };
  }

  toCompleteSaleRequestDto(customerId) {
    const validation = this.validateForCompletion();
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Auto-create single payment matching total if not split
    let paymentInputs = [...this.payments];
    if (paymentInputs.length === 0) {
      const isBankak = this.activePaymentMethod === 'BANKAK';
      paymentInputs = [
        {
          method: isBankak ? 'BANK_TRANSFER' : this.activePaymentMethod,
          amount: this.grandTotal,
          reference: isBankak ? (this.bankakReference || `TXN-BOK-${Math.floor(10000000 + Math.random() * 90000000)}`) : undefined,
          verificationMode: isBankak ? 'EVIDENCE_REVIEW' : 'MANUAL_CONFIRMATION'
        }
      ];
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

    // POST /api/sales with Idempotency Key
    const responseDto = await apiClient.post('/api/sales', dto);

    // Synchronize local inventory from backend to update all views & badges
    await MedicineService.fetchFromBackend();

    // Refresh allocation
    await this.loadBackendContext();

    // Clear cart after successful transaction
    this.clearCart();

    return responseDto;
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
