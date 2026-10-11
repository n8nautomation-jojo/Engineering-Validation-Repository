-- Migration 003: Offline Safety Allocation Validity (SQLite)
-- Schema additions and triggers enforcing validity window invariants

ALTER TABLE offline_allocations ADD COLUMN issued_at TEXT;
ALTER TABLE offline_allocations ADD COLUMN valid_from TEXT;
ALTER TABLE offline_allocations ADD COLUMN expires_at TEXT;

UPDATE offline_allocations 
SET state = 'SUSPENDED', version = version + 1 
WHERE (issued_at IS NULL OR valid_from IS NULL OR expires_at IS NULL) 
  AND state = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_offline_allocations_expiry 
ON offline_allocations (branch_id, device_id, product_id, state, expires_at);

CREATE TRIGGER IF NOT EXISTS trg_offline_allocations_insert_temporal
BEFORE INSERT ON offline_allocations
FOR EACH ROW
WHEN NEW.state = 'ACTIVE' AND (
  NEW.issued_at IS NULL OR NEW.valid_from IS NULL OR NEW.expires_at IS NULL OR
  LENGTH(NEW.issued_at) != 24 OR LENGTH(NEW.valid_from) != 24 OR LENGTH(NEW.expires_at) != 24 OR
  NEW.issued_at > NEW.valid_from OR NEW.valid_from >= NEW.expires_at
)
BEGIN
  SELECT RAISE(ABORT, 'INVALID_ALLOCATION_TEMPORAL_WINDOW');
END;

CREATE TRIGGER IF NOT EXISTS trg_offline_allocations_update_temporal
BEFORE UPDATE OF state, issued_at, valid_from, expires_at ON offline_allocations
FOR EACH ROW
WHEN NEW.state = 'ACTIVE' AND (
  NEW.issued_at IS NULL OR NEW.valid_from IS NULL OR NEW.expires_at IS NULL OR
  LENGTH(NEW.issued_at) != 24 OR LENGTH(NEW.valid_from) != 24 OR LENGTH(NEW.expires_at) != 24 OR
  NEW.issued_at > NEW.valid_from OR NEW.valid_from >= NEW.expires_at
)
BEGIN
  SELECT RAISE(ABORT, 'INVALID_ALLOCATION_TEMPORAL_WINDOW');
END;
