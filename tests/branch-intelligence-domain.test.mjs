import test from 'node:test';
import assert from 'node:assert/strict';
import { branchesRepository } from '../apps/api/branches.mjs';

test('MVP-3 Multi-Branch: Directory returns active enterprise branches with liquidity limits', () => {
  const branches = branchesRepository.getBranches();
  assert.ok(branches.length >= 3, 'Must have at least 3 enterprise branches');

  const mainBranch = branchesRepository.getBranchById('brn-khartoum-01');
  assert.ok(mainBranch, 'Main Khartoum branch must exist');
  assert.equal(mainBranch.code, 'KRT-MAIN');
  assert.ok(mainBranch.liquidityLimit > 0, 'Liquidity limit must be defined');
});

test('MVP-3 Multi-Branch: Consolidated analytics computes network KPIs and comparative matrix', () => {
  const analytics = branchesRepository.getConsolidatedAnalytics('TODAY');
  assert.ok(analytics.summary, 'Analytics summary must exist');
  assert.ok(analytics.summary.totalBranchesCount >= 3, 'Branch count in summary');
  assert.ok(analytics.summary.networkTotalRevenue >= 0, 'Total revenue computed');
  assert.ok(analytics.paymentSplit.cash.percent >= 0, 'Cash payment percentage computed');
  assert.ok(analytics.paymentSplit.bankak.percent >= 0, 'Bankak payment percentage computed');

  // Performance matrix must rank branches
  assert.ok(analytics.performanceMatrix.length >= 3, 'Performance matrix has branch rows');
  assert.ok(analytics.performanceMatrix[0].revenue >= analytics.performanceMatrix[1].revenue, 'Sorted by revenue descending');
});

test('MVP-3 Multi-Branch: Stock rebalancing engine detects surplus and generates recommendations', () => {
  const recs = branchesRepository.getStockRebalancingRecommendations();
  assert.ok(Array.isArray(recs), 'Recommendations must be an array');
  assert.ok(recs.length > 0, 'Must generate rebalancing suggestions');

  const firstRec = recs[0];
  assert.ok(firstRec.id.startsWith('REC-REBAL-'), 'Recommendation ID format');
  assert.ok(firstRec.productId, 'Product ID specified');
  assert.ok(firstRec.sourceBranchId, 'Source branch identified');
  assert.ok(firstRec.destinationBranchId, 'Destination branch identified');
  assert.ok(firstRec.recommendedQuantity > 0, 'Recommended quantity must be > 0');
  assert.ok(firstRec.rationale, 'Rationale in Arabic provided');
});

test('MVP-3 Multi-Branch: Applying stock rebalancing recommendation generates official transfer with audit', () => {
  const recs = branchesRepository.getStockRebalancingRecommendations();
  assert.ok(recs.length > 0);
  const targetRec = recs[0];

  const result = branchesRepository.applyStockRebalancingRecommendation(targetRec.id, 'د. أحمد الطاهر (المدير العام)');
  assert.ok(result.success, 'Apply recommendation must succeed');
  assert.ok(result.transfer, 'Generated transfer record');
  assert.equal(result.transfer.status, 'DISPATCHED');
  assert.equal(result.transfer.items[0].productId, targetRec.productId);
  assert.equal(result.transfer.items[0].dispatchedQuantity, targetRec.recommendedQuantity);
  assert.ok(result.transfer.history.length >= 2, 'Must have audit history');
});

test('MVP-3 Multi-Branch: Consolidated expiry risk matrix calculates exposure and routing', () => {
  const matrix = branchesRepository.getConsolidatedExpiryMatrix();
  assert.ok(matrix.asOfDate, 'Must have extraction timestamp');
  assert.ok(Array.isArray(matrix.batches), 'Must have batches array');
  assert.ok(matrix.totalEstimatedRiskSDG >= 0, 'Must compute total financial exposure in SDG');
});

test('MVP-3 Multi-Branch: Governance health monitors branch liquidity and flags threshold breaches', () => {
  const healthList = branchesRepository.getBranchGovernanceHealth();
  assert.ok(healthList.length >= 3, 'Must evaluate all branches');

  for (const h of healthList) {
    assert.ok(h.healthScore >= 0 && h.healthScore <= 100, 'Score must be clamped between 0 and 100');
    assert.ok(h.healthRating, 'Rating label provided');
    assert.ok(h.liquidity.liquidityLimit > 0, 'Liquidity limit defined');
    assert.ok(Array.isArray(h.flags), 'Flags must be an array');
  }
});
