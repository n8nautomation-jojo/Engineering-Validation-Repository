-- Migration 004: Offline Safety Allocation Validity (PostgreSQL)

ALTER TABLE offline_allocations ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
ALTER TABLE offline_allocations ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE offline_allocations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE offline_allocations 
SET state = 'SUSPENDED', version = version + 1 
WHERE (issued_at IS NULL OR valid_from IS NULL OR expires_at IS NULL) 
  AND state = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_offline_allocations_expiry 
ON offline_allocations (branch_id, device_id, product_id, state, expires_at);

ALTER TABLE offline_allocations 
DROP CONSTRAINT IF EXISTS chk_offline_allocations_temporal_integrity;

ALTER TABLE offline_allocations 
ADD CONSTRAINT chk_offline_allocations_temporal_integrity 
CHECK (
  state != 'ACTIVE' OR (
    issued_at IS NOT NULL AND valid_from IS NOT NULL AND expires_at IS NOT NULL AND
    issued_at <= valid_from AND valid_from < expires_at
  )
);
