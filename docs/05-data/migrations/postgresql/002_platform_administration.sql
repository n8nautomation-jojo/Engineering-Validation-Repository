create extension if not exists pgcrypto;

-- Platform Administration PostgreSQL migration
-- Status: implementation migration; no platform capability promotion.
create table if not exists platform_tenants (
  id uuid primary key,
  code text not null unique,
  name text not null,
  status text not null check (status in ('ACTIVE','SUSPENDED','DISABLED')),
  version bigint not null default 1,
  created_at timestamptz not null default now()
);
create table if not exists platform_organizations (
  id uuid primary key,
  tenant_id uuid not null references platform_tenants(id),
  name text not null,
  legal_name text,
  status text not null check (status in ('ACTIVE','INACTIVE')),
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  unique (tenant_id,id)
);
create table if not exists platform_branches (
  id uuid primary key,
  organization_id uuid not null references platform_organizations(id),
  name text not null,
  code text not null,
  status text not null check (status in ('ACTIVE','INACTIVE')),
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  unique (organization_id,code)
);
create table if not exists platform_subscriptions (
  id uuid primary key,
  tenant_id uuid not null references platform_tenants(id),
  plan_code text not null,
  status text not null check (status in ('ACTIVE','TRIAL','SUSPENDED','EXPIRED')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create table if not exists platform_users (
  id uuid primary key,
  tenant_id uuid not null references platform_tenants(id),
  organization_id uuid not null references platform_organizations(id),
  branch_id uuid not null references platform_branches(id),
  username text not null,
  display_name text not null,
  status text not null check (status in ('PROVISIONED','PASSWORD_CHANGE_REQUIRED','ACTIVE','DISABLED','LOCKED','REVOKED')),
  credential_id uuid,
  credential_expires_at timestamptz,
  credential_consumed_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  unique (lower(username))
);
create table if not exists platform_idempotency (
  command_name text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key (command_name,idempotency_key)
);
create table if not exists platform_audit (
  id uuid primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid not null,
  action text not null,
  resource_type text not null,
  resource_id uuid not null,
  correlation_id text not null,
  reason text not null,
  after_json jsonb not null
);
create index if not exists idx_platform_org_tenant on platform_organizations(tenant_id);
create index if not exists idx_platform_branch_org on platform_branches(organization_id);
create index if not exists idx_platform_subscription_tenant on platform_subscriptions(tenant_id);
create index if not exists idx_platform_user_tenant on platform_users(tenant_id);

create or replace function platform_audit_no_update_delete() returns trigger language plpgsql as $$
begin raise exception 'PLATFORM_AUDIT_APPEND_ONLY'; end; $$;
drop trigger if exists trg_platform_audit_no_update_delete on platform_audit;
create trigger trg_platform_audit_no_update_delete before update or delete on platform_audit
for each row execute function platform_audit_no_update_delete();

-- Integration validation trigger: real PostgreSQL transaction/idempotency/uniqueness suite is authoritative in CI.
