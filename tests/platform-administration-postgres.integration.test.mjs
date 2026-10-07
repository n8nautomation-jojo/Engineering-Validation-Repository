import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const shouldRun = Boolean(databaseUrl);
const maybe = (name, fn) => test(name, { skip: !shouldRun }, fn);

function graph(suffix) {
  const tenantId=randomUUID(), orgId=randomUUID(), branchId=randomUUID(), subId=randomUUID(), userId=randomUUID();
  return {
    tenant:{id:tenantId,name:`Tenant ${suffix}`,code:`tenant-${suffix}`,status:"ACTIVE",version:1},
    organization:{id:orgId,tenantId,name:`Org ${suffix}`,legalName:null,status:"ACTIVE",version:1},
    branch:{id:branchId,organizationId:orgId,name:`Branch ${suffix}`,code:`branch-${suffix}`,status:"ACTIVE",version:1},
    subscription:{id:subId,tenantId:tenantId,planCode:"STANDARD",status:"ACTIVE",startsAt:"2026-10-01T00:00:00Z",endsAt:null,version:1},
    initialAdmin:{id:userId,tenantId:tenantId,organizationId:orgId,branchId:branchId,username:`admin-${suffix}`,displayName:"Initial Admin",status:"PASSWORD_CHANGE_REQUIRED",version:1}
  };
}
function credential(id= randomUUID()){ return {credentialId:id,expiresAt:"2026-10-08T00:00:00Z"}; }
function result(g,c){ return {tenantId:g.tenant.id,organizationId:g.organization.id,branchId:g.branch.id,initialAdminUserId:g.initialAdmin.id,initialAdminLifecycle:"PASSWORD_CHANGE_REQUIRED",temporaryCredential:c,stockCreated:false,pharmacyTransactionsCreated:false}; }
function idem(g,c,key="key-1",hash="hash-1"){ return {key,commandName:"platform.tenants.provision",requestHash:hash,responseStatus:201,responseBody:result(g,c),createdAt:"2026-10-07T00:00:00Z"}; }

async function setup(){
  const pool=new Pool({connectionString:databaseUrl});
  await pool.query("truncate platform_audit, platform_idempotency, platform_users, platform_subscriptions, platform_branches, platform_organizations, platform_tenants cascade");
  const migration=await readFile("docs/05-data/migrations/postgresql/002_platform_administration.sql","utf8");
  await pool.query(migration);
  return pool;
}
async function tx(pool){
  const client=await pool.connect();
  await client.query("begin");
  return {
    client,
    id:randomUUID(),
    async query(sql,values){const r=await client.query(sql,values);return {rows:r.rows,rowCount:r.rowCount??0};},
    async commit(){await client.query("commit");client.release();},
    async rollback(){try{await client.query("rollback");}finally{client.release();}}
  };
}

maybe("successful atomic provisioning writes the complete graph and audit",async()=>{
  const pool=await setup();
  try{
    const m=await import("../dist/src/infrastructure/sql/platform-administration.js");
    const adapter=new m.PostgresPlatformAdministrationPersistence(pool);
    const g=graph("success"), c=credential(), i=idem(g,c,"success-key","success-hash");
    const t=await tx(pool);
    const actual=await adapter.provisionAtomic({transaction:t,graph:g,credential:c,idempotency:i,audit:{actorId:randomUUID(),action:"PLATFORM_TENANT_PROVISIONED",correlationId:"corr-success",reason:"onboarding",resourceId:g.tenant.id}});
    await t.commit();
    assert.deepEqual(actual,i.responseBody);
    const q=await pool.query("select (select count(*) from platform_tenants where id=$1) tenants,(select count(*) from platform_organizations where id=$2) orgs,(select count(*) from platform_branches where id=$3) branches,(select count(*) from platform_subscriptions where id=$4) subscriptions,(select count(*) from platform_users where id=$5) users,(select count(*) from platform_idempotency where command_name=$6 and idempotency_key=$7) idem",( [g.tenant.id,g.organization.id,g.branch.id,g.subscription.id,g.initialAdmin.id,i.commandName,i.key] ));
    assert.deepEqual(Object.values(q.rows[0]),["1","1","1","1","1","1"]);
    const audit=await pool.query("select after_json from platform_audit where resource_id=$1",[g.tenant.id]);
    assert.equal(audit.rowCount,1);
    assert.equal(audit.rows[0].after_json.userId,g.initialAdmin.id);
  } finally { await pool.end(); }
});

maybe("rollback removes every earlier graph insert after a later constraint failure",async()=>{
  const pool=await setup();
  try{
    const m=await import("../dist/src/infrastructure/sql/platform-administration.js");
    const adapter=new m.PostgresPlatformAdministrationPersistence(pool);
    const seed=graph("seed");
    await pool.query("insert into platform_tenants(id,code,name,status,version) values($1,$2,$3,$4,$5)",[seed.tenant.id,seed.tenant.code,seed.tenant.name,seed.tenant.status,1]);
    await pool.query("insert into platform_organizations(id,tenant_id,name,status,version) values($1,$2,$3,$4,$5)",[seed.organization.id,seed.tenant.id,seed.organization.name,seed.organization.status,1]);
    await pool.query("insert into platform_branches(id,organization_id,name,code,status,version) values($1,$2,$3,$4,$5)",[seed.branch.id,seed.organization.id,seed.branch.name,seed.branch.code,seed.branch.status,1]);
    const g=graph("rollback"); g.branch.code=seed.branch.code;
    const c=credential(), i=idem(g,c,"rollback-key","rollback-hash"), t=await tx(pool);
    await assert.rejects(()=>adapter.provisionAtomic({transaction:t,graph:g,credential:c,idempotency:i,audit:{actorId:randomUUID(),action:"PLATFORM_TENANT_PROVISIONED",correlationId:"corr-rollback",reason:"test",resourceId:g.tenant.id}}));
    await t.rollback();
    const q=await pool.query("select count(*) from platform_tenants where id=$1",[g.tenant.id]);
    assert.equal(q.rows[0].count,"0");
    const q2=await pool.query("select count(*) from platform_organizations where id=$1",[g.organization.id]);
    assert.equal(q2.rows[0].count,"0");
  } finally { await pool.end(); }
});

maybe("idempotency replay returns the original result and rejects a different request hash",async()=>{
  const pool=await setup();
  try{
    const m=await import("../dist/src/infrastructure/sql/platform-administration.js");
    const adapter=new m.PostgresPlatformAdministrationPersistence(pool);
    const g=graph("idem"), c=credential(), i=idem(g,c,"idem-key","hash-a"), t=await tx(pool);
    await adapter.provisionAtomic({transaction:t,graph:g,credential:c,idempotency:i,audit:{actorId:randomUUID(),action:"PLATFORM_TENANT_PROVISIONED",correlationId:"corr-idem",reason:"test",resourceId:g.tenant.id}});
    await t.commit();
    assert.deepEqual(await adapter.findProvisioningIdempotency(i.key,i.commandName,"hash-a"),i.responseBody);
    await assert.rejects(()=>adapter.findProvisioningIdempotency(i.key,i.commandName,"hash-b"),/IDEMPOTENCY_KEY_REUSE_WITH_DIFFERENT_REQUEST/);
  } finally { await pool.end(); }
});

maybe("database uniqueness protects tenant code, branch code within organization, and username",async()=>{
  const pool=await setup();
  try{
    const g1=graph("unique-a"), g2=graph("unique-b");
    await pool.query("insert into platform_tenants(id,code,name,status,version) values($1,$2,$3,$4,1)",[g1.tenant.id,g1.tenant.code,g1.tenant.name,g1.tenant.status]);
    await assert.rejects(()=>pool.query("insert into platform_tenants(id,code,name,status,version) values($1,$2,$3,$4,1)",[g2.tenant.id,g1.tenant.code,g2.tenant.name,g2.tenant.status]),e=>e.code==="23505");
    await pool.query("insert into platform_organizations(id,tenant_id,name,status,version) values($1,$2,$3,$4,1)",[g1.organization.id,g1.tenant.id,g1.organization.name,g1.organization.status]);
    await pool.query("insert into platform_branches(id,organization_id,name,code,status,version) values($1,$2,$3,$4,1)",[g1.branch.id,g1.organization.id,g1.branch.name,g1.branch.code,g1.branch.status]);
    await assert.rejects(()=>pool.query("insert into platform_branches(id,organization_id,name,code,status,version) values($1,$2,$3,$4,1)",[g2.branch.id,g1.organization.id,g2.branch.name,g1.branch.code,g2.branch.status]),e=>e.code==="23505");
    await pool.query("insert into platform_users(id,tenant_id,organization_id,branch_id,username,display_name,status,version) values($1,$2,$3,$4,$5,$6,$7,1)",[g1.initialAdmin.id,g1.tenant.id,g1.organization.id,g1.branch.id,"SameUser","A","ACTIVE"]);
    await assert.rejects(()=>pool.query("insert into platform_users(id,tenant_id,organization_id,branch_id,username,display_name,status,version) values($1,$2,$3,$4,$5,$6,$7,1)",[g2.initialAdmin.id,g1.tenant.id,g1.organization.id,g1.branch.id,"sameuser","B","ACTIVE"]),e=>e.code==="23505");
  } finally { await pool.end(); }
});

maybe("subscription temporal check rejects end before start",async()=>{
  const pool=await setup();
  try{
    const g=graph("time");
    await pool.query("insert into platform_tenants(id,code,name,status,version) values($1,$2,$3,$4,1)",[g.tenant.id,g.tenant.code,g.tenant.name,g.tenant.status]);
    await assert.rejects(()=>pool.query("insert into platform_subscriptions(id,tenant_id,plan_code,status,starts_at,ends_at,version) values($1,$2,$3,$4,$5,$6,1)",[g.subscription.id,g.tenant.id,"STANDARD","ACTIVE","2026-10-02T00:00:00Z","2026-10-01T00:00:00Z"]),e=>e.code==="23514");
  } finally { await pool.end(); }
});

maybe("audit is append-only",async()=>{
  const pool=await setup();
  try{
    const id=randomUUID(), actor=randomUUID(), resource=randomUUID();
    await pool.query("insert into platform_audit(id,actor_id,action,resource_type,resource_id,correlation_id,reason,after_json) values($1,$2,'X','TENANT',$3,'c','r','{}')",[id,actor,resource]);
    await assert.rejects(()=>pool.query("update platform_audit set reason='changed' where id=$1",[id]),/PLATFORM_AUDIT_APPEND_ONLY/);
    await assert.rejects(()=>pool.query("delete from platform_audit where id=$1",[id]),/PLATFORM_AUDIT_APPEND_ONLY/);
  } finally { await pool.end(); }
});

maybe("concurrent same-key provisioning commits exactly one complete graph",async()=>{
  const pool=new Pool({connectionString:databaseUrl});
  await setupAndKeep(pool);
  try{
    const m=await import("../dist/src/infrastructure/sql/platform-administration.js");
    const adapter=new m.PostgresPlatformAdministrationPersistence(pool);
    const g=graph("concurrent"), c=credential(), i=idem(g,c,"concurrent-key","concurrent-hash");
    const make=async(label)=>{
      const t=await tx(pool);
      try{
        const r=await adapter.provisionAtomic({transaction:t,graph:g,credential:c,idempotency:i,audit:{actorId:randomUUID(),action:"PLATFORM_TENANT_PROVISIONED",correlationId:`corr-${label}`,reason:"test",resourceId:g.tenant.id}});
        await t.commit(); return {ok:true,r};
      }catch(error){await t.rollback();return {ok:false,error};}
    };
    const [a,b]=await Promise.all([make("a"),make("b")]);
    assert.equal(Number(a.ok)+Number(b.ok),1);
    const q=await pool.query("select count(*) from platform_tenants where id=$1",[g.tenant.id]);
    assert.equal(q.rows[0].count,"1");
    const q2=await pool.query("select count(*) from platform_idempotency where command_name=$1 and idempotency_key=$2",[i.commandName,i.key]);
    assert.equal(q2.rows[0].count,"1");
  } finally { await pool.end(); }
});

async function setupAndKeep(pool){
  await pool.query("truncate platform_audit, platform_idempotency, platform_users, platform_subscriptions, platform_branches, platform_organizations, platform_tenants cascade");
  const migration=await readFile("docs/05-data/migrations/postgresql/002_platform_administration.sql","utf8");
  await pool.query(migration);
}
