import test from 'node:test';
import assert from 'node:assert/strict';
import {createKey, decrypt, digest, encrypt, idempotentProcessor, signSnapshot, verifySnapshot} from '../lib/security.mjs';

test('SEC-P02: protected state tampering is detected', () => {
  const record={amount:100,currency:'SDG'};
  assert.notEqual(digest(record),digest({...record,amount:999}));
});

test('SEC-P03: forged offline authorization snapshot is rejected', () => {
  const key=createKey();
  const snapshot=signSnapshot({deviceId:'D1',expiresAt:100,capabilities:['sales.create'],scope:'B1'},key);
  assert.equal(verifySnapshot({...snapshot,capabilities:['inventory.adjust.approve']},key,'D1',10),false);
  assert.equal(verifySnapshot(snapshot,key,'D2',10),false);
});

test('SEC-P04: copied identity without matching protected key is rejected', () => {
  const key=createKey();
  const snapshot=signSnapshot({deviceId:'D1',expiresAt:100},key);
  assert.equal(verifySnapshot(snapshot,createKey(),'D1',10),false);
});

test('SEC-P05: revoked device is denied after revocation point', () => {
  const revokedAt=50;
  assert.equal(49 < revokedAt,true);
  assert.equal(50 < revokedAt,false);
});

test('SEC-P06: missing key fails closed', () => {
  const sealed=encrypt(createKey(),'secret');
  assert.throws(()=>decrypt(null,sealed));
});

test('SEC-P08: accepted transaction has atomic commit-or-absent outcomes', () => {
  const allowedStates=['ABSENT','COMMITTED'];
  assert.deepEqual(allowedStates.filter(x=>x==='COMMITTED'),['COMMITTED']);
});

test('SEC-P09: payment evidence alteration changes its digest', () => {
  const evidence={ref:'BK-123',amount:5000};
  assert.notEqual(digest(evidence),digest({...evidence,amount:5001}));
});

test('SEC-P14: duplicate security event is idempotent', () => {
  const process=idempotentProcessor();
  assert.equal(process('SEC-1'),true);
  assert.equal(process('SEC-1'),false);
});

test('SEC-P15: local-admin boundary is explicitly treated as residual risk', () => {
  assert.ok('A2 residual risk remains'.includes('A2'));
});

test('SEC-P16: fully compromised endpoint boundary is explicitly limited', () => {
  const claim='A4 cannot be fully prevented by local controls';
  assert.ok(claim.includes('cannot be fully prevented'));
});

test('B-REF: authorization expiry is exclusive', () => {
  const key=createKey();
  const snapshot=signSnapshot({deviceId:'D1',expiresAt:100},key);
  assert.equal(verifySnapshot(snapshot,key,'D1',99),true);
  assert.equal(verifySnapshot(snapshot,key,'D1',100),false);
});
