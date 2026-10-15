/**
 * PharmaTech — Multi-Branch Intelligence Client Service (MVP-3)
 * Provides frontend access to:
 *  - Enterprise Branches Directory
 *  - Consolidated Cross-Branch Analytics
 *  - Smart Stock Rebalancing Engine & Recommendations
 *  - Consolidated FEFO Expiry Risk Matrix
 *  - Branch Governance & Liquidity Safeguards
 */

import { apiClient } from './apiClient.js';

export class BranchIntelligenceService {
  /**
   * Fetch all enterprise branches
   */
  static async fetchBranches() {
    return apiClient.get('/api/branches');
  }

  /**
   * Fetch consolidated network analytics
   */
  static async fetchConsolidatedAnalytics(period = 'TODAY') {
    return apiClient.get(`/api/branches/intelligence/consolidated?period=${encodeURIComponent(period)}`);
  }

  /**
   * Fetch smart stock rebalancing recommendations
   */
  static async fetchRebalancingRecommendations() {
    return apiClient.get('/api/branches/intelligence/rebalancing-recommendations');
  }

  /**
   * Apply a stock rebalancing recommendation (1-Click Dispatch)
   */
  static async applyRebalancingRecommendation(recId, authorizedUser) {
    return apiClient.post(`/api/branches/intelligence/rebalancing-recommendations/${recId}/apply`, {
      authorizedUser
    });
  }

  /**
   * Fetch consolidated FEFO expiry risk matrix
   */
  static async fetchExpiryRiskMatrix() {
    return apiClient.get('/api/branches/intelligence/expiry-risk-matrix');
  }

  /**
   * Fetch branch governance health, cash limits & compliance scores
   */
  static async fetchGovernanceHealth() {
    return apiClient.get('/api/branches/intelligence/governance-health');
  }
}
