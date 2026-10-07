-- PharmaTech P0-4 SQLite foundation schema
-- Driver/ORM agnostic. Business rules remain in the application/domain layer.

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  conflict_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  state TEXT NOT NULL,
  resolution_class TEXT NOT NULL,
  original_effect_ids TEXT NOT NULL,
  resulting_effect_ids TEXT NOT NULL,
  created_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  request_fingerprint TEXT,
  resolved_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sync_conflicts_resolution_fingerprint
  ON sync_conflicts (id, request_fingerprint);

CREATE TABLE IF NOT EXISTS audit_records (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  branch_id TEXT,
  device_id TEXT,
  correlation_id TEXT NOT NULL,
  reason TEXT,
  before_json TEXT,
  after_json TEXT
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  key TEXT NOT NULL,
  command_name TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (key, command_name)
);
