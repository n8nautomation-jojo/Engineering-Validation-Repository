import type { CompleteSaleRequestDto, SaleLineRequestDto, PaymentInputDto } from "../api/types.js";

export interface CatalogBatch {
  readonly batchNumber: string;
  readonly expiryDate: string; // YYYY-MM-DD
  readonly availableQuantity: number;
}

export interface CatalogProduct {
  readonly id: string;
  readonly sku: string;
  readonly barcode: string;
  readonly name: string;
  readonly nameAr: string;
  readonly category: string;
  readonly unit: string;
  readonly price: number;
  readonly prescriptionRequired: boolean;
  readonly batches: readonly CatalogBatch[];
}

export interface CartItem {
  readonly productId: string;
  readonly name: string;
  readonly nameAr: string;
  readonly sku: string;
  readonly batchNumber: string;
  readonly expiryDate: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly lineTotal: number;
}

export interface PosPaymentEntry {
  readonly method: "CASH" | "BANK_TRANSFER";
  readonly amount: number;
  readonly verificationMode?: "MANUAL_CONFIRMATION" | "EVIDENCE_REVIEW" | "API_VERIFICATION";
  readonly reference?: string;
}

export interface PosSessionInfo {
  readonly cashRegisterId: string;
  readonly cashSessionId: string;
  readonly cashierId: string;
  readonly cashierName: string;
  readonly branchId: string;
}

export interface OfflineAllocationStatus {
  readonly deviceId: string;
  readonly totalCapacity: number;
  readonly consumedCapacity: number;
}

export class PosViewModel {
  private _cart: CartItem[] = [];
  private _payments: PosPaymentEntry[] = [];
  private _session: PosSessionInfo;
  private _allocation: OfflineAllocationStatus;
  private _isOffline = false;
  private _pendingSyncCount = 0;

  constructor(session: PosSessionInfo, allocation: OfflineAllocationStatus) {
    this._session = session;
    this._allocation = allocation;
  }

  public get cart(): readonly CartItem[] {
    return this._cart;
  }

  public get payments(): readonly PosPaymentEntry[] {
    return this._payments;
  }

  public get session(): PosSessionInfo {
    return this._session;
  }

  public get isOffline(): boolean {
    return this._isOffline;
  }

  public setOffline(offline: boolean): void {
    this._isOffline = offline;
  }

  public get pendingSyncCount(): number {
    return this._pendingSyncCount;
  }

  public incrementPendingSync(): void {
    this._pendingSyncCount += 1;
  }

  public get allocationRemaining(): number {
    return Math.max(0, this._allocation.totalCapacity - this._allocation.consumedCapacity);
  }

  /**
   * Selects earliest expiring batch (FEFO - First Expired First Out)
   */
  public selectFefoBatch(product: CatalogProduct): CatalogBatch | null {
    if (!product.batches || product.batches.length === 0) return null;
    const now = new Date().toISOString().split("T")[0]!;
    // Filter out expired batches
    const validBatches = product.batches
      .filter(b => b.availableQuantity > 0 && b.expiryDate >= now)
      .slice()
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    return validBatches[0] ?? null;
  }

  public addItem(product: CatalogProduct, preferredBatch?: string, quantity = 1): void {
    if (quantity <= 0) throw new Error("QUANTITY_MUST_BE_POSITIVE");

    let batch: CatalogBatch | null = null;
    if (preferredBatch) {
      batch = product.batches.find(b => b.batchNumber === preferredBatch) ?? null;
    } else {
      batch = this.selectFefoBatch(product);
    }

    if (!batch) {
      throw new Error(`NO_VALID_STOCK_AVAILABLE: Product ${product.name} has no available non-expired batch`);
    }

    const now = new Date().toISOString().split("T")[0]!;
    if (batch.expiryDate < now) {
      throw new Error(`BATCH_EXPIRED: Batch ${batch.batchNumber} expired on ${batch.expiryDate}`);
    }

    const existingIndex = this._cart.findIndex(
      item => item.productId === product.id && item.batchNumber === batch.batchNumber
    );

    const existingQty = existingIndex >= 0 ? this._cart[existingIndex]!.quantity : 0;
    const targetQty = existingQty + quantity;

    // Check offline allocation if in offline mode
    if (this._isOffline) {
      const currentCartTotalUnits = this._cart.reduce((sum, item) => sum + item.quantity, 0);
      if (currentCartTotalUnits + quantity > this.allocationRemaining) {
        throw new Error("OFFLINE_ALLOCATION_EXHAUSTED: Exceeds allowed device quota");
      }
    }

    if (targetQty > batch.availableQuantity) {
      throw new Error(`INSUFFICIENT_BATCH_STOCK: Max available is ${batch.availableQuantity}`);
    }

    const lineTotal = Number((targetQty * product.price).toFixed(2));
    const newItem: CartItem = {
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      sku: product.sku,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      unitPrice: product.price,
      quantity: targetQty,
      lineTotal
    };

    if (existingIndex >= 0) {
      this._cart[existingIndex] = newItem;
    } else {
      this._cart.push(newItem);
    }
  }

  public removeItem(productId: string, batchNumber: string): void {
    this._cart = this._cart.filter(i => !(i.productId === productId && i.batchNumber === batchNumber));
  }

  public clearCart(): void {
    this._cart = [];
    this._payments = [];
  }

  public get subtotal(): number {
    return Number(this._cart.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));
  }

  public get tax(): number {
    // Standard Sudan tax model: medicines are zero-rated / exempt by default
    return 0.00;
  }

  public get grandTotal(): number {
    return Number((this.subtotal + this.tax).toFixed(2));
  }

  public get totalPaid(): number {
    return Number(this._payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2));
  }

  public get remainingBalance(): number {
    return Math.max(0, Number((this.grandTotal - this.totalPaid).toFixed(2)));
  }

  public addPayment(payment: PosPaymentEntry): void {
    if (payment.amount <= 0) throw new Error("PAYMENT_AMOUNT_MUST_BE_POSITIVE");
    this._payments.push(payment);
  }

  public removePayment(index: number): void {
    this._payments.splice(index, 1);
  }

  public clearPayments(): void {
    this._payments = [];
  }

  public validateForCompletion(): { valid: boolean; reason?: string } {
    if (this._cart.length === 0) {
      return { valid: false, reason: "CART_IS_EMPTY" };
    }
    if (Math.abs(this.totalPaid - this.grandTotal) > 0.001) {
      return {
        valid: false,
        reason: `PAYMENT_MISMATCH: Paid ${this.totalPaid} SDG vs Total ${this.grandTotal} SDG`
      };
    }
    if (this._isOffline) {
      const totalUnits = this._cart.reduce((sum, i) => sum + i.quantity, 0);
      if (totalUnits > this.allocationRemaining) {
        return { valid: false, reason: "OFFLINE_ALLOCATION_EXHAUSTED" };
      }
    }
    return { valid: true };
  }

  /**
   * Transforms active cart into OpenAPI 3.1 CompleteSaleRequestDto
   */
  public toCompleteSaleRequestDto(customerId?: string): CompleteSaleRequestDto {
    const validation = this.validateForCompletion();
    if (!validation.valid) {
      throw new Error(`CANNOT_COMPLETE_SALE: ${validation.reason}`);
    }

    const lines: SaleLineRequestDto[] = this._cart.map(item => ({
      product_id: item.productId,
      quantity: { value: item.quantity.toString(), unit_code: "EA" },
      unit_price: { value: item.unitPrice.toFixed(2), currency: "SDG" },
      batch_id: item.batchNumber
    }));

    const payments: PaymentInputDto[] = this._payments.map(p => ({
      method: p.method,
      amount: { value: p.amount.toFixed(2), currency: "SDG" },
      ...(p.verificationMode ? { verification_mode: p.verificationMode } : {}),
      ...(p.reference ? { evidence_reference: p.reference } : {})
    }));

    const dto: CompleteSaleRequestDto = {
      cash_register_id: this._session.cashRegisterId,
      cash_session_id: this._session.cashSessionId,
      lines,
      payments,
      ...(customerId ? { customer_id: customerId } : {})
    };

    return dto;
  }
}
