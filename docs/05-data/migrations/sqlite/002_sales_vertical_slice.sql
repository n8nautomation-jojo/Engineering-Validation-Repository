-- PharmaTech P0-B SQLite Sales Vertical Slice Migration
-- Creates physical durable tables for sales, lines, payments,
-- inventory transactions, stock movements, offline allocations, and outbox events.

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  warehouse_id TEXT,
  device_id TEXT NOT NULL,
  cash_session_id TEXT NOT NULL,
  status TEXT NOT NULL,
  currency TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  idempotency_key TEXT,
  correlation_id TEXT
);

CREATE TABLE IF NOT EXISTS sale_lines (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  product_id TEXT NOT NULL,
  batch_id TEXT NOT NULL REFERENCES batches(id),
  quantity NUMERIC NOT NULL,
  unit_price_amount NUMERIC NOT NULL,
  unit_price_currency TEXT NOT NULL,
  line_total_amount NUMERIC NOT NULL,
  line_total_currency TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  method TEXT NOT NULL,
  amount_value NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  reference TEXT
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reversal_of_transaction_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  inventory_transaction_id TEXT NOT NULL REFERENCES inventory_transactions(id),
  product_id TEXT NOT NULL,
  batch_id TEXT NOT NULL REFERENCES batches(id),
  warehouse_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  source_transaction_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offline_allocations (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  allocated_capacity NUMERIC NOT NULL,
  consumed_capacity NUMERIC NOT NULL,
  released_capacity NUMERIC NOT NULL,
  state TEXT NOT NULL,
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  aggregate_version INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  branch_id TEXT,
  device_id TEXT,
  correlation_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE INDEX IF NOT EXISTS ix_batches_fefo ON batches(product_id, warehouse_id, status, expiry_date);
CREATE INDEX IF NOT EXISTS ix_offline_allocations_lookup ON offline_allocations(branch_id, device_id, product_id, state);
CREATE INDEX IF NOT EXISTS ix_sale_lines_sale_id ON sale_lines(sale_id);
CREATE INDEX IF NOT EXISTS ix_payments_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS ix_stock_movements_tx ON stock_movements(inventory_transaction_id);
