import test from 'node:test';
import assert from 'node:assert/strict';
import { accountingRepository } from '../apps/api/accounting.mjs';

test('MVP-2 Accounting: Chart of Accounts retrieves standard hierarchy and validates types', () => {
  const accounts = accountingRepository.getChartOfAccounts();
  assert.ok(accounts.length >= 10, 'Chart of accounts must contain standard pharmaceutical accounts');

  const cashSafe = accountingRepository.getAccountById('1111');
  assert.ok(cashSafe, 'Account 1111 (Main Cash Safe) must exist');
  assert.equal(cashSafe.type, 'ASSET');
  assert.equal(cashSafe.normalBalance, 'DEBIT');

  const salesRev = accountingRepository.getAccountById('4110');
  assert.ok(salesRev, 'Account 4110 (Sales Revenue) must exist');
  assert.equal(salesRev.type, 'REVENUE');
  assert.equal(salesRev.normalBalance, 'CREDIT');

  const apSuppliers = accountingRepository.getAccountById('2110');
  assert.ok(apSuppliers, 'Account 2110 (Accounts Payable) must exist');
  assert.equal(apSuppliers.type, 'LIABILITY');
  assert.equal(apSuppliers.normalBalance, 'CREDIT');
});

test('MVP-2 Accounting: Journal entry creation strictly requires balanced double entry', () => {
  // 1. Unbalanced entry must fail
  assert.throws(() => {
    accountingRepository.createJournalEntry({
      entryDate: '2026-10-15T12:00:00.000Z',
      description: 'قيد غير متوازن تجريبي',
      lines: [
        { accountCode: '1111', debit: 5000, credit: 0 },
        { accountCode: '4110', debit: 0, credit: 4000 } // Diff 1000!
      ]
    });
  }, /القيد المحاسبي غير متوازن/);

  // 2. Single line entry must fail
  assert.throws(() => {
    accountingRepository.createJournalEntry({
      entryDate: '2026-10-15T12:00:00.000Z',
      description: 'قيد بسطر واحد',
      lines: [
        { accountCode: '1111', debit: 5000, credit: 0 }
      ]
    });
  }, /سطرين محاسبيين على الأقل/);

  // 3. Balanced entry must succeed
  const validEntry = accountingRepository.createJournalEntry({
    entryDate: '2026-10-15T12:00:00.000Z',
    description: 'قيد تسوية متوازن تجريبي',
    lines: [
      { accountCode: '1111', debit: 25000, credit: 0, narration: 'إيداع نقدي' },
      { accountCode: '4110', debit: 0, credit: 25000, narration: 'إيراد خدمات' }
    ]
  });

  assert.ok(validEntry.id, 'Entry must be assigned an ID');
  assert.equal(validEntry.status, 'POSTED');
  assert.equal(validEntry.totalAmount, 25000);
});

test('MVP-2 Accounting: Locked fiscal periods reject new journal entries', () => {
  // Q1 2026 is locked in our seed data
  assert.throws(() => {
    accountingRepository.createJournalEntry({
      entryDate: '2026-02-15T10:00:00.000Z', // Falls into FP-2026-Q1 which is LOCKED
      description: 'محاولة ترحيل في فترة مقفلة',
      lines: [
        { accountCode: '1111', debit: 1000, credit: 0 },
        { accountCode: '4110', debit: 0, credit: 1000 }
      ]
    });
  }, /مغلقة أو مقفلة نهائياً/);
});

test('MVP-2 Accounting: Immutability and reversal entries (Non-destructive reversal)', () => {
  // Post an entry
  const entry = accountingRepository.createJournalEntry({
    entryDate: '2026-10-15T12:05:00.000Z',
    description: 'قيد تجريبي للاختبار تمهيداً لعكسه',
    lines: [
      { accountCode: '1111', debit: 12000, credit: 0 },
      { accountCode: '4110', debit: 0, credit: 12000 }
    ]
  });

  // Reverse it
  const { originalEntry, reversalEntry } = accountingRepository.reverseJournalEntry(entry.id, {
    reason: 'خطأ في التوجيه المحاسبي للإيراد',
    resolvedBy: 'المراجع المالي'
  });

  assert.equal(originalEntry.status, 'REVERSED');
  assert.equal(originalEntry.reversedByEntryId, reversalEntry.id);
  assert.equal(reversalEntry.status, 'POSTED');
  assert.equal(reversalEntry.sourceModule, 'REVERSAL');
  assert.equal(reversalEntry.totalAmount, 12000);

  // Debits and credits must be mirrored in reversal entry
  const revCashLine = reversalEntry.lines.find(l => l.accountCode === '1111');
  assert.equal(revCashLine.credit, 12000);
  assert.equal(revCashLine.debit, 0);

  // Cannot reverse an already reversed entry
  assert.throws(() => {
    accountingRepository.reverseJournalEntry(entry.id);
  }, /معكوس مسبقاً/);
});

test('MVP-2 Accounting: Automated event posting from sales, purchasing, and adjustments', () => {
  // 1. Retail Sale Event Posting
  const saleEntry = accountingRepository.postSaleJournalEntry({
    invoice_number: 'INV-TEST-0999',
    created_at: '2026-10-15T12:10:00.000Z',
    totals: { total: '10000.00' },
    cashier_name: 'د. طارق',
    items: [
      { unitPrice: 10000, quantity: 1, costPrice: 7000 }
    ]
  });

  assert.ok(saleEntry, 'Sale entry must be created');
  assert.equal(saleEntry.sourceModule, 'POS_SALES');
  assert.equal(saleEntry.lines.length, 4, 'Sale requires 4 lines: Cash, Revenue, COGS, Inventory');

  // 2. Purchasing Invoice Event Posting
  const purchEntry = accountingRepository.postPurchasingInvoiceJournalEntry({
    invoiceNumber: 'SUP-INV-TEST-01',
    invoiceDate: '2026-10-15T12:15:00.000Z',
    supplierName: 'شركة الوابل الطبية',
    totalAmount: 50000
  });

  assert.ok(purchEntry, 'Purchasing entry must be created');
  assert.equal(purchEntry.sourceModule, 'PURCHASING');
  assert.equal(purchEntry.totalAmount, 50000);

  // 3. Supplier Payment Event Posting
  const paymentEntry = accountingRepository.postSupplierPaymentJournalEntry({
    id: 'PAY-TEST-01',
    referenceNumber: 'REC-SUP-55',
    settledAt: '2026-10-15T12:20:00.000Z',
    supplierName: 'شركة الوابل الطبية',
    paymentMethod: 'CASH',
    amount: 30000
  });

  assert.ok(paymentEntry, 'Supplier payment entry must be created');
  assert.equal(paymentEntry.sourceModule, 'PAYMENT');
  assert.equal(paymentEntry.totalAmount, 30000);

  // 4. Inventory Expired/Damaged Loss Event Posting
  const damageEntry = accountingRepository.postInventoryDamageJournalEntry({
    id: 'ADJ-DMG-01',
    date: '2026-10-15T12:25:00.000Z',
    productName: 'شراب ملطف تالف',
    batchNumber: 'BATCH-EXPIRED',
    estimatedLossAmount: 8500
  });

  assert.ok(damageEntry, 'Damage adjustment entry must be created');
  assert.equal(damageEntry.sourceModule, 'INVENTORY');
  assert.equal(damageEntry.totalAmount, 8500);
});

test('MVP-2 Accounting: Financial statements (Trial Balance, Income Statement, Balance Sheet)', () => {
  // 1. Trial Balance
  const tb = accountingRepository.getTrialBalance('2026-10-31T23:59:59.999Z');
  assert.ok(tb.rows.length > 0, 'Trial balance must return rows');
  assert.ok(tb.totalDebits > 0, 'Total debits must be > 0');
  assert.ok(tb.totalCredits > 0, 'Total credits must be > 0');
  assert.equal(tb.discrepancy, 0, 'Trial balance discrepancy must be zero');
  assert.equal(tb.isBalanced, true, 'Trial balance must be balanced');

  // 2. Income Statement
  const is = accountingRepository.getIncomeStatement('2026-01-01T00:00:00.000Z', '2026-10-31T23:59:59.999Z');
  assert.ok(is.totalRevenue >= 0, 'Revenue calculated');
  assert.ok(is.totalCogs >= 0, 'COGS calculated');
  assert.equal(is.grossProfit, is.totalRevenue - is.totalCogs);
  assert.equal(is.netProfit, is.grossProfit - is.totalOperatingExpenses);

  // 3. Balance Sheet & Golden Accounting Equation
  const bs = accountingRepository.getBalanceSheet('2026-10-31T23:59:59.999Z');
  assert.ok(bs.totalAssets > 0, 'Total assets must be > 0');
  assert.ok(bs.totalLiabilities >= 0, 'Total liabilities calculated');
  assert.ok(bs.totalEquity > 0, 'Total equity calculated');
  assert.equal(bs.isEquationBalanced, true, 'Accounting equation (Assets = Liabilities + Equity) must balance');
});
