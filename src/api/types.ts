export interface MoneyDto {
  readonly value: string;
  readonly currency: string;
}

export interface QuantityDto {
  readonly value: string;
  readonly unit_code: string;
}

export interface SaleLineRequestDto {
  readonly product_id: string;
  readonly batch_id?: string;
  readonly quantity: QuantityDto;
  readonly unit_price?: MoneyDto;
}

export interface PaymentInputDto {
  readonly method: "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD" | "OTHER";
  readonly amount: MoneyDto;
  readonly verification_mode?: string;
  readonly evidence_reference?: string;
}

export interface CompleteSaleRequestDto {
  readonly cash_register_id: string;
  readonly cash_session_id: string;
  readonly customer_id?: string;
  readonly prescription_id?: string;
  readonly lines: readonly SaleLineRequestDto[];
  readonly payments: readonly PaymentInputDto[];
  readonly note?: string;
  readonly client_operation_id?: string;
}

export interface CompleteSaleResponseDto {
  readonly sale_id: string;
  readonly invoice_number: string;
  readonly status: "COMPLETED";
  readonly totals: {
    readonly subtotal: string;
    readonly tax: string;
    readonly total: string;
    readonly currency: string;
  };
  readonly payment_summary: {
    readonly paid_amount: string;
    readonly change_amount: string;
  };
  readonly inventory_effect: {
    readonly transaction_id: string;
    readonly consumed_allocations?: readonly string[];
  };
  readonly sync_status: "PENDING_SYNC" | "SYNCED";
  readonly correlation_id: string;
}

export interface ApiErrorDto {
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;
  readonly retryable: boolean;
}

export interface ApiErrorResponseDto {
  readonly error: ApiErrorDto;
  readonly meta?: {
    readonly correlation_id?: string;
  };
}

export interface PageDto<T = unknown> {
  readonly data: readonly T[];
  readonly meta: {
    readonly correlation_id?: string;
    readonly next_cursor?: string;
    readonly has_more: boolean;
  };
}

export interface StockAdjustmentRequestDto {
  readonly warehouse_id: string;
  readonly product_id: string;
  readonly batch_id?: string;
  readonly quantity_delta: QuantityDto;
  readonly reason_code: string;
  readonly notes?: string;
}

export interface StockTransferRequestDto {
  readonly source_warehouse_id: string;
  readonly target_warehouse_id: string;
  readonly items: readonly {
    readonly product_id: string;
    readonly batch_id: string;
    readonly quantity: QuantityDto;
  }[];
}

export interface GoodsReceiptRequestDto {
  readonly purchase_order_id?: string;
  readonly supplier_id: string;
  readonly warehouse_id: string;
  readonly items: readonly {
    readonly product_id: string;
    readonly batch_number: string;
    readonly expiry_date: string;
    readonly quantity: QuantityDto;
    readonly unit_cost: MoneyDto;
  }[];
}

export interface SyncPushRequestDto {
  readonly device_id: string;
  readonly client_sequence: number;
  readonly operations: readonly {
    readonly operation_id: string;
    readonly entity_type: string;
    readonly payload: unknown;
  }[];
}

export interface SyncConflictResolutionRequestDto {
  readonly conflict_id: string;
  readonly resolution_strategy: "ACCEPT_SERVER" | "FORCE_CLIENT" | "MANUAL_SPLIT";
  readonly resolved_payload?: unknown;
}
