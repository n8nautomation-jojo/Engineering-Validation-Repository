/**
 * PharmaTech — Accounting Client Service (MVP-2 / Module Boundary)
 * Provides frontend access to:
 *  - Chart of Accounts
 *  - Fiscal Periods
 *  - General Journal Entries & Balanced Double-Entry Posting
 *  - Non-destructive Reversals
 *  - Financial Statements: Trial Balance, Income Statement, Balance Sheet, Ledger
 */

import { apiClient } from './apiClient.js';

export class AccountingService {
  /**
   * Fetch Chart of Accounts
   */
  static async fetchAccounts(filter = {}) {
    const params = new URLSearchParams();
    if (filter.type) params.append('type', filter.type);
    if (filter.category) params.append('category', filter.category);
    if (filter.search) params.append('search', filter.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/accounting/accounts${query}`);
  }

  /**
   * Create new account in chart
   */
  static async createAccount(accountData) {
    return apiClient.post('/api/accounting/accounts', accountData);
  }

  /**
   * Fetch Fiscal Periods
   */
  static async fetchPeriods() {
    return apiClient.get('/api/accounting/periods');
  }

  /**
   * Lock a fiscal period
   */
  static async lockPeriod(periodId) {
    return apiClient.post(`/api/accounting/periods/${periodId}/lock`, {});
  }

  /**
   * Reopen a fiscal period
   */
  static async reopenPeriod(periodId) {
    return apiClient.post(`/api/accounting/periods/${periodId}/reopen`, {});
  }

  /**
   * Fetch General Ledger Journal Entries
   */
  static async fetchJournalEntries(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.sourceModule) params.append('sourceModule', filters.sourceModule);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/accounting/journal-entries${query}`);
  }

  /**
   * Post a balanced double-entry
   */
  static async createJournalEntry(entryData) {
    return apiClient.post('/api/accounting/journal-entries', entryData);
  }

  /**
   * Reverse an existing journal entry
   */
  static async reverseJournalEntry(entryId, reason, resolvedBy) {
    return apiClient.post(`/api/accounting/journal-entries/${entryId}/reverse`, {
      reason,
      resolvedBy
    });
  }

  /**
   * Fetch Trial Balance
   */
  static async fetchTrialBalance(asOfDate) {
    const query = asOfDate ? `?asOfDate=${encodeURIComponent(asOfDate)}` : '';
    return apiClient.get(`/api/accounting/statements/trial-balance${query}`);
  }

  /**
   * Fetch Income Statement (P&L)
   */
  static async fetchIncomeStatement(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/accounting/statements/income-statement${query}`);
  }

  /**
   * Fetch Balance Sheet
   */
  static async fetchBalanceSheet(asOfDate) {
    const query = asOfDate ? `?asOfDate=${encodeURIComponent(asOfDate)}` : '';
    return apiClient.get(`/api/accounting/statements/balance-sheet${query}`);
  }

  /**
   * Fetch General Ledger Account Statement
   */
  static async fetchAccountLedger(accountId, startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/accounting/ledger/${accountId}${query}`);
  }
}
