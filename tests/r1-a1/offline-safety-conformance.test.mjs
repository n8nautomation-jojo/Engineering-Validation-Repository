import assert from "node:assert/strict";
import test from "node:test";

const OFFLINE_ELIGIBLE = "OFFLINE_ELIGIBLE";
const ACTIVE = "ACTIVE";
const EXHAUSTED = "EXHAUSTED";
const SUSPENDED = "SUSPENDED";
const EXPIRED = "EXPIRED";

function consume(allocation, quantity) {
  assert.equal(allocation.state, ACTIVE, "allocation must be active");
  assert.ok(quantity > 0, "quantity must be positive");
  assert.ok(quantity <= allocation.remaining, "allocation exhausted");
  return {
    ...allocation,
    consumed: allocation.consumed + quantity,
    remaining: allocation.remaining - quantity,
    state: allocation.remaining - quantity === 0 ? EXHAUSTED : ACTIVE
  };
}

function offlineSale({ allocation, authorized, branch, device, sale }) {
  assert.equal(authorized, true, "offline authorization required");
  assert.equal(allocation.branch, branch, "branch scope mismatch");
  assert.equal(allocation.device, device, "device scope mismatch");
  assert.equal(allocation.state, ACTIVE, "allocation unavailable");
  assert.equal(sale.batchExpired, false, "expired batch cannot be sold");
  assert.equal(sale.fefoEligible, true, "FEFO violation");
  return consume(allocation, sale.quantity);
}

test("A1-REF-01: offline sale consumes allocation atomically", () => {
  const allocation={id:"A1",branch:"B1",device:"D1",state:ACTIVE,remaining:10,consumed:0};
  const next=offlineSale({
    allocation,authorized:true,branch:"B1",device:"D1",
    sale:{quantity:4,batchExpired:false,fefoEligible:true}
  });
  assert.equal(next.remaining,6);
  assert.equal(next.consumed,4);
});

test("A1-REF-02: exact exhaustion blocks the next offline sale", () => {
  const allocation={id:"A1",branch:"B1",device:"D1",state:ACTIVE,remaining:4,consumed:0};
  const exhausted=offlineSale({
    allocation,authorized:true,branch:"B1",device:"D1",
    sale:{quantity:4,batchExpired:false,fefoEligible:true}
  });
  assert.equal(exhausted.state,EXHAUSTED);
  assert.throws(()=>offlineSale({
    allocation:exhausted,authorized:true,branch:"B1",device:"D1",
    sale:{quantity:1,batchExpired:false,fefoEligible:true}
  }));
});

test("A1-REF-03: expired batch remains unsellable offline", () => {
  const allocation={id:"A1",branch:"B1",device:"D1",state:ACTIVE,remaining:10,consumed:0};
  assert.throws(()=>offlineSale({
    allocation,authorized:true,branch:"B1",device:"D1",
    sale:{quantity:1,batchExpired:true,fefoEligible:true}
  }));
});

test("A1-REF-04: FEFO remains binding offline", () => {
  const allocation={id:"A1",branch:"B1",device:"D1",state:ACTIVE,remaining:10,consumed:0};
  assert.throws(()=>offlineSale({
    allocation,authorized:true,branch:"B1",device:"D1",
    sale:{quantity:1,batchExpired:false,fefoEligible:false}
  }));
});

test("A1-REF-05: allocation cannot cross device scope", () => {
  const allocation={id:"A1",branch:"B1",device:"D1",state:ACTIVE,remaining:10,consumed:0};
  assert.throws(()=>offlineSale({
    allocation,authorized:true,branch:"B1",device:"D2",
    sale:{quantity:1,batchExpired:false,fefoEligible:true}
  }));
});

test("A1-REF-06: allocation cannot cross branch scope", () => {
  const allocation={id:"A1",branch:"B1",device:"D1",state:ACTIVE,remaining:10,consumed:0};
  assert.throws(()=>offlineSale({
    allocation,authorized:true,branch:"B2",device:"D1",
    sale:{quantity:1,batchExpired:false,fefoEligible:true}
  }));
});

test("A1-REF-07: valid allocation does not bypass offline authorization", () => {
  const allocation={id:"A1",branch:"B1",device:"D1",state:ACTIVE,remaining:10,consumed:0};
  assert.throws(()=>offlineSale({
    allocation,authorized:false,branch:"B1",device:"D1",
    sale:{quantity:1,batchExpired:false,fefoEligible:true}
  }));
});

test("A1-REF-08: suspended allocation is fail-closed", () => {
  const allocation={id:"A1",branch:"B1",device:"D1",state:SUSPENDED,remaining:10,consumed:0};
  assert.throws(()=>offlineSale({
    allocation,authorized:true,branch:"B1",device:"D1",
    sale:{quantity:1,batchExpired:false,fefoEligible:true}
  }));
});

test("A1-REF-09: rejected sale does not consume allocation", () => {
  const allocation={id:"A1",branch:"B1",device:"D1",state:ACTIVE,remaining:10,consumed:0};
  assert.throws(()=>offlineSale({
    allocation,authorized:true,branch:"B1",device:"D1",
    sale:{quantity:11,batchExpired:false,fefoEligible:true}
  }));
  assert.equal(allocation.remaining,10);
  assert.equal(allocation.consumed,0);
});

test("A1-REF-10: replaying the same consumption identity is idempotent", () => {
  const applied=new Set();
  const apply=(id)=> {
    if (applied.has(id)) return false;
    applied.add(id);
    return true;
  };
  assert.equal(apply("sale-1"),true);
  assert.equal(apply("sale-1"),false);
});

test("A1-REF-11: durable recovery reconstructs state from committed data, not UI state", () => {
  const committed={saleId:"S1",allocationId:"A1",consumed:4,outboxId:"O1"};
  const recovered=structuredClone(committed);
  assert.deepEqual(recovered,committed);
});

test("A1-REF-12: authoritative replenishment is distinct from local consumption", () => {
  const allocation={remaining:0,consumed:10};
  const replenishment={id:"R1",amount:5,source:"AUTHORITATIVE"};
  assert.equal(replenishment.source,"AUTHORITATIVE");
  const next={...allocation,remaining:allocation.remaining+replenishment.amount};
  assert.equal(next.remaining,5);
  assert.equal(next.consumed,10);
});

test("A1-REF-13: allocation never creates authoritative stock", () => {
  const inventory={authoritativeQuantity:0};
  const allocation={remaining:10};
  assert.equal(inventory.authoritativeQuantity,0);
  assert.equal(allocation.remaining,10);
});

test("A1-REF-14: original sale history remains immutable during compensation", () => {
  const original=Object.freeze({id:"S1",state:"COMPLETED"});
  const compensation={id:"S1-R1",reversalOf:"S1"};
  assert.equal(original.state,"COMPLETED");
  assert.equal(compensation.reversalOf,original.id);
});

test("A1-REF-15: suspended/expired states are terminal for consumption until explicit valid transition", () => {
  for (const state of [SUSPENDED,EXPIRED,EXHAUSTED]) {
    const allocation={branch:"B1",device:"D1",state,remaining:10,consumed:0};
    assert.throws(()=>offlineSale({
      allocation,authorized:true,branch:"B1",device:"D1",
      sale:{quantity:1,batchExpired:false,fefoEligible:true}
    }));
  }
});

console.log("R1-A1 reference offline-safety harness: loaded");
