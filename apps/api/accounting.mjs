/**
 * PharmaTech — Accounting Domain & General Ledger Repository (MVP-2 / Module Boundary)
 * Strictly enforces:
 *  - Double-entry debit/credit balance constraint
 *  - Immutability of posted journal entries (reversal rather than destructive edit)
 *  - Locked fiscal period boundary protection
 *  - Cloud-authoritative automated event posting handlers (Sales, Purchasing, Inventory, Settlements)
 *  - Standard Financial Statements (Trial Balance, Income Statement, Balance Sheet, Account Ledger)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

const ACCOUNTS_FILE = path.join(DATA_DIR, 'chart-of-accounts.json');
const PERIODS_FILE = path.join(DATA_DIR, 'fiscal-periods.json');
const ENTRIES_FILE = path.join(DATA_DIR, 'journal-entries.json');

function readJsonFile(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Accounting] Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[Accounting] Error writing ${filePath}:`, err);
    throw err;
  }
}

export class AccountingRepository {
  constructor() {
    this.accounts = readJsonFile(ACCOUNTS_FILE);
    this.periods = readJsonFile(PERIODS_FILE);
    this.entries = readJsonFile(ENTRIES_FILE);
  }

  reload() {
    this.accounts = readJsonFile(ACCOUNTS_FILE);
    this.periods = readJsonFile(PERIODS_FILE);
    this.entries = readJsonFile(ENTRIES_FILE);
  }

  // =========================================================================
  // 1. CHART OF ACCOUNTS (دليل وشجرة الحسابات)
  // =========================================================================

  getChartOfAccounts(filter = {}) {
    this.reload();
    let result = [...this.accounts];

    if (filter.type) {
      result = result.filter(a => a.type === filter.type.toUpperCase());
    }

    if (filter.category) {
      result = result.filter(a => a.category === filter.category.toUpperCase());
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(a =>
        a.code.includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.nameEn && a.nameEn.toLowerCase().includes(q))
      );
    }

    return result;
  }

  getAccountById(idOrCode) {
    this.reload();
    return this.accounts.find(a => a.id === idOrCode || a.code === idOrCode) || null;
  }

  createAccount(dto) {
    this.reload();
    if (!dto.code || !dto.name || !dto.type) {
      throw new Error('بيانات الحساب غير مكتملة: الرمز والاسم والنوع إلزامية');
    }

    const existing = this.accounts.find(a => a.code === dto.code.trim());
    if (existing) {
      throw new Error(`رمز الحساب (${dto.code}) مسجل مسبقاً في الدليل المحاسبي`);
    }

    const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
    if (!validTypes.includes(dto.type.toUpperCase())) {
      throw new Error(`نوع الحساب غير صالح. الأنواع المتاحة: ${validTypes.join(', ')}`);
    }

    const normalBalance = (dto.type === 'ASSET' || dto.type === 'EXPENSE') ? 'DEBIT' : 'CREDIT';

    const newAccount = {
      id: `ACC-${dto.code.trim()}`,
      code: dto.code.trim(),
      name: dto.name.trim(),
      nameEn: dto.nameEn ? dto.nameEn.trim() : '',
      type: dto.type.toUpperCase(),
      category: dto.category ? dto.category.toUpperCase() : 'POSTABLE',
      parentId: dto.parentId || null,
      normalBalance,
      currentBalance: Number(dto.initialBalance) || 0,
      status: 'ACTIVE'
    };

    this.accounts.push(newAccount);
    writeJsonFile(ACCOUNTS_FILE, this.accounts);
    return newAccount;
  }

  updateAccount(id, dto) {
    this.reload();
    const idx = this.accounts.findIndex(a => a.id === id || a.code === id);
    if (idx === -1) {
      throw new Error(`الحساب المحاسبي (${id}) غير موجود`);
    }

    const acc = this.accounts[idx];
    if (dto.name) acc.name = dto.name.trim();
    if (dto.nameEn !== undefined) acc.nameEn = dto.nameEn.trim();
    if (dto.status) acc.status = dto.status.toUpperCase();

    this.accounts[idx] = acc;
    writeJsonFile(ACCOUNTS_FILE, this.accounts);
    return acc;
  }

  // =========================================================================
  // 2. FISCAL PERIODS (الفترات المالية والرقابة الدورية)
  // =========================================================================

  getFiscalPeriods() {
    this.reload();
    return [...this.periods].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }

  getCoveringFiscalPeriods(dateInput = new Date()) {
    this.reload();
    const date = new Date(dateInput);
    return this.periods.filter(p => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return date >= start && date <= end;
    });
  }

  getActiveFiscalPeriod(dateInput = new Date()) {
    const covering = this.getCoveringFiscalPeriods(dateInput);
    if (!covering.length) return null;

    // If ANY covering period is explicitly LOCKED or CLOSED, return that locked period so callers know
    const locked = covering.find(p => p.status === 'LOCKED' || p.status === 'CLOSED');
    if (locked) return locked;

    // Otherwise prioritize the most specific period: MONTH > QUARTER > YEAR
    const month = covering.find(p => p.periodType === 'MONTH');
    if (month) return month;
    const quarter = covering.find(p => p.periodType === 'QUARTER');
    if (quarter) return quarter;
    return covering[0];
  }

  lockFiscalPeriod(id, supervisorUser = 'مدير النظام') {
    this.reload();
    const idx = this.periods.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new Error(`الفترة المالية (${id}) غير موجودة`);
    }

    this.periods[idx].status = 'LOCKED';
    this.periods[idx].lockedAt = new Date().toISOString();
    this.periods[idx].lockedBy = supervisorUser;

    writeJsonFile(PERIODS_FILE, this.periods);
    return this.periods[idx];
  }

  reopenFiscalPeriod(id, supervisorUser = 'مدير النظام') {
    this.reload();
    const idx = this.periods.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new Error(`الفترة المالية (${id}) غير موجودة`);
    }

    this.periods[idx].status = 'OPEN';
    this.periods[idx].reopenedAt = new Date().toISOString();
    this.periods[idx].reopenedBy = supervisorUser;

    writeJsonFile(PERIODS_FILE, this.periods);
    return this.periods[idx];
  }

  // =========================================================================
  // 3. GENERAL JOURNAL & DOUBLE-ENTRY POSTING (قيود اليومية والترحيل المزدوج)
  // =========================================================================

  getJournalEntries(filters = {}) {
    this.reload();
    let result = [...this.entries];

    if (filters.status) {
      result = result.filter(e => e.status === filters.status.toUpperCase());
    }

    if (filters.sourceModule) {
      result = result.filter(e => e.sourceModule === filters.sourceModule.toUpperCase());
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      result = result.filter(e => new Date(e.entryDate) >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      result = result.filter(e => new Date(e.entryDate) <= end);
    }

    return result.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
  }

  getJournalEntryById(id) {
    this.reload();
    return this.entries.find(e => e.id === id || e.entryNumber === id) || null;
  }

  /**
   * Posts a balanced double-entry General Journal Entry
   * Invariants:
   *  1. At least 2 lines
   *  2. sum(debit) === sum(credit)
   *  3. Target accounts must be active and exist
   *  4. Entry date must be within an OPEN fiscal period
   *  5. Updates Chart of Accounts balances atomically
   */
  createJournalEntry(dto) {
    this.reload();

    if (!dto.lines || !Array.isArray(dto.lines) || dto.lines.length < 2) {
      throw new Error('قيد اليومية يتطلب سطرين محاسبيين على الأقل (طرف مدين وطرف دائن)');
    }

    const entryDate = dto.entryDate ? new Date(dto.entryDate).toISOString() : new Date().toISOString();

    // Check fiscal period status
    const period = this.getActiveFiscalPeriod(entryDate);
    if (!period) {
      throw new Error(`لا توجد فترة مالية معرفة لتاريخ القيد (${entryDate.slice(0, 10)})`);
    }

    if (period.status === 'LOCKED' || period.status === 'CLOSED') {
      throw new Error(`لا يمكن ترحيل قيود محاسبية: الفترة المالية (${period.name}) مغلقة أو مقفلة نهائياً`);
    }

    let totalDebit = 0;
    let totalCredit = 0;
    const validatedLines = [];

    for (let i = 0; i < dto.lines.length; i++) {
      const line = dto.lines[i];
      const acc = this.getAccountById(line.accountId || line.accountCode);
      if (!acc) {
        throw new Error(`السطر ${i + 1}: الحساب المحاسبي (${line.accountId || line.accountCode}) غير موجود`);
      }
      if (acc.status !== 'ACTIVE') {
        throw new Error(`السطر ${i + 1}: الحساب (${acc.name}) غير نشط أو معطل`);
      }

      const debit = Math.round((Number(line.debit) || 0) * 100) / 100;
      const credit = Math.round((Number(line.credit) || 0) * 100) / 100;

      if (debit < 0 || credit < 0) {
        throw new Error(`السطر ${i + 1}: لا يمكن إدخال مبالغ سالبة في المدين أو الدائن`);
      }

      if (debit === 0 && credit === 0) {
        throw new Error(`السطر ${i + 1}: يجب تحديد مبلغ مدين أو دائن أكبر من الصفر`);
      }

      totalDebit += debit;
      totalCredit += credit;

      validatedLines.push({
        accountId: acc.id,
        accountCode: acc.code,
        accountNameAr: acc.name,
        debit,
        credit,
        narration: line.narration ? line.narration.trim() : (dto.description || '')
      });
    }

    // Verify double-entry balance (sum debit === sum credit)
    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.01) {
      throw new Error(`القيد المحاسبي غير متوازن! إجمالي المدين (${totalDebit.toLocaleString()}) لا يساوي إجمالي الدائن (${totalCredit.toLocaleString()}). الفارق: ${diff}`);
    }

    const nextSeq = this.entries.length + 1;
    const padSeq = String(nextSeq).padStart(3, '0');
    const now = new Date();
    const entryNumber = `JV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${padSeq}`;
    const entryId = `JE-${now.getFullYear()}-${padSeq}-${Date.now().toString(36).slice(-4)}`;

    const newEntry = {
      id: entryId,
      entryNumber,
      entryDate,
      fiscalPeriodId: period.id,
      sourceModule: dto.sourceModule ? dto.sourceModule.toUpperCase() : 'MANUAL',
      referenceId: dto.referenceId || null,
      description: dto.description ? dto.description.trim() : 'قيد يومية عام',
      status: 'POSTED',
      totalAmount: totalDebit,
      lines: validatedLines,
      createdBy: dto.createdBy || 'المحاسب المالي',
      createdAt: new Date().toISOString(),
      reversedByEntryId: null
    };

    // Apply balance effects to Chart of Accounts
    for (const line of validatedLines) {
      const accIdx = this.accounts.findIndex(a => a.id === line.accountId);
      if (accIdx !== -1) {
        const acc = this.accounts[accIdx];
        if (acc.normalBalance === 'DEBIT') {
          acc.currentBalance += (line.debit - line.credit);
        } else {
          acc.currentBalance += (line.credit - line.debit);
        }
        this.accounts[accIdx] = acc;
      }
    }

    this.entries.push(newEntry);
    writeJsonFile(ACCOUNTS_FILE, this.accounts);
    writeJsonFile(ENTRIES_FILE, this.entries);

    return newEntry;
  }

  /**
   * Reverses an existing posted journal entry (Non-destructive reversal)
   * The original entry is marked REVERSED and cannot be altered.
   * A mirror reversal entry is posted with swapped debits & credits.
   */
  reverseJournalEntry(id, reversalDto = {}) {
    this.reload();
    const origIdx = this.entries.findIndex(e => e.id === id || e.entryNumber === id);
    if (origIdx === -1) {
      throw new Error(`قيد اليومية (${id}) غير موجود`);
    }

    const orig = this.entries[origIdx];
    if (orig.status === 'REVERSED') {
      throw new Error(`القيد المحاسبي (${orig.entryNumber}) معكوس مسبقاً`);
    }

    const reversalReason = reversalDto.reason ? reversalDto.reason.trim() : 'عكس وتصحيح قيد محاسبي';
    const supervisor = reversalDto.resolvedBy || 'المدير المالي';

    // Construct reversed lines (swapping debits and credits)
    const reversedLines = orig.lines.map(line => ({
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountNameAr: line.accountNameAr,
      debit: line.credit,
      credit: line.debit,
      narration: `عكس السطر: ${line.narration || orig.description}`
    }));

    // Post reversal entry
    const reversalEntry = this.createJournalEntry({
      entryDate: new Date().toISOString(),
      sourceModule: 'REVERSAL',
      referenceId: orig.entryNumber,
      description: `قيد عكسي للقيد (${orig.entryNumber}): ${reversalReason}`,
      lines: reversedLines,
      createdBy: supervisor
    });

    // Mark original entry as REVERSED
    this.reload();
    const updatedOrigIdx = this.entries.findIndex(e => e.id === orig.id);
    if (updatedOrigIdx !== -1) {
      this.entries[updatedOrigIdx].status = 'REVERSED';
      this.entries[updatedOrigIdx].reversedByEntryId = reversalEntry.id;
      this.entries[updatedOrigIdx].reversalReason = reversalReason;
      this.entries[updatedOrigIdx].reversedAt = new Date().toISOString();
      this.entries[updatedOrigIdx].reversedBy = supervisor;
      writeJsonFile(ENTRIES_FILE, this.entries);
    }

    return {
      originalEntry: this.entries[updatedOrigIdx],
      reversalEntry
    };
  }

  // =========================================================================
  // 4. AUTOMATED POSTING HANDLERS (معالجات الترحيل الآلي للأحداث)
  // =========================================================================

  /**
   * Automatically posts journal entry for a completed retail sale
   */
  postSaleJournalEntry(sale) {
    if (!sale) return null;

    const totalSale = Number(sale.totals?.total || sale.total || 0);
    if (totalSale <= 0) return null;

    // Detect payment mode
    const isBankak = sale.payments?.some(p => p.method === 'BANK_TRANSFER' || p.method === 'FAWRY');
    const cashOrBankAccountId = isBankak ? 'ACC-1113' : 'ACC-1112'; // 1113 Bankak or 1112 POS Cash

    // Calculate cost (or estimate at 70% of retail if cost not explicitly tracked per item)
    let cogsAmount = 0;
    if (sale.items && Array.isArray(sale.items)) {
      cogsAmount = sale.items.reduce((sum, item) => {
        const itemCost = item.costPrice || (item.unitPrice ? item.unitPrice * 0.7 : 0);
        return sum + (itemCost * (item.quantity || 1));
      }, 0);
    }
    if (cogsAmount <= 0) {
      cogsAmount = Math.round(totalSale * 0.7);
    }

    const lines = [
      // 1. Debit Cash/Bank
      {
        accountId: cashOrBankAccountId,
        debit: totalSale,
        credit: 0,
        narration: `مقبوضات مبيعات الفاتورة ${sale.invoice_number || sale.id}`
      },
      // 2. Credit Sales Revenue
      {
        accountId: 'ACC-4110',
        debit: 0,
        credit: totalSale,
        narration: `إيراد مبيعات الفاتورة ${sale.invoice_number || sale.id}`
      },
      // 3. Debit COGS
      {
        accountId: 'ACC-5100',
        debit: cogsAmount,
        credit: 0,
        narration: `تكلفة صرف أدوية الفاتورة ${sale.invoice_number || sale.id}`
      },
      // 4. Credit Pharmacy Inventory
      {
        accountId: 'ACC-1131',
        debit: 0,
        credit: cogsAmount,
        narration: `صرف مخزني للأدوية المباعة للفاتورة ${sale.invoice_number || sale.id}`
      }
    ];

    return this.createJournalEntry({
      entryDate: sale.created_at || new Date().toISOString(),
      sourceModule: 'POS_SALES',
      referenceId: sale.invoice_number || sale.id,
      description: `ترحيل مبيعات نقطة البيع — فاتورة رقم (${sale.invoice_number || sale.id})`,
      lines,
      createdBy: sale.cashier_name || 'نظام الترحيل الآلي لنقاط البيع'
    });
  }

  /**
   * Automatically posts journal entry for verified supplier commercial invoice
   */
  postPurchasingInvoiceJournalEntry(invoice) {
    if (!invoice) return null;
    const totalAmount = Number(invoice.totalAmount || 0);
    if (totalAmount <= 0) return null;

    const lines = [
      // 1. Debit Inventory (1131)
      {
        accountId: 'ACC-1131',
        debit: totalAmount,
        credit: 0,
        narration: `إضافة أدوية ومستلزمات واردة بموجب فاتورة المورد ${invoice.invoiceNumber || invoice.id}`
      },
      // 2. Credit Accounts Payable (2110)
      {
        accountId: 'ACC-2110',
        debit: 0,
        credit: totalAmount,
        narration: `استحقاق تجاري للمورد ${invoice.supplierName || 'المورد'}`
      }
    ];

    return this.createJournalEntry({
      entryDate: invoice.invoiceDate || new Date().toISOString(),
      sourceModule: 'PURCHASING',
      referenceId: invoice.invoiceNumber || invoice.id,
      description: `استحقاق فاتورة توريد أدوية — ${invoice.supplierName || 'مورد'} (${invoice.invoiceNumber || invoice.id})`,
      lines,
      createdBy: invoice.verifiedBy || 'إدارة المشتريات والتموين'
    });
  }

  /**
   * Automatically posts journal entry for supplier AP settlement payment
   */
  postSupplierPaymentJournalEntry(payment) {
    if (!payment) return null;
    const amount = Number(payment.amount || 0);
    if (amount <= 0) return null;

    const cashOrBankAccountId = (payment.paymentMethod === 'BANK_TRANSFER' || payment.paymentMethod === 'BANKAK')
      ? 'ACC-1113'
      : 'ACC-1111';

    const lines = [
      // 1. Debit Accounts Payable (2110) - decreases liability
      {
        accountId: 'ACC-2110',
        debit: amount,
        credit: 0,
        narration: `سداد دفعة حساب للمورد ${payment.supplierName || 'المورد'}`
      },
      // 2. Credit Cash/Bank - decreases asset
      {
        accountId: cashOrBankAccountId,
        debit: 0,
        credit: amount,
        narration: `صرف من ${cashOrBankAccountId === 'ACC-1113' ? 'حساب بنكك' : 'الخزينة الرئيسية'}`
      }
    ];

    return this.createJournalEntry({
      entryDate: payment.settledAt || new Date().toISOString(),
      sourceModule: 'PAYMENT',
      referenceId: payment.referenceNumber || payment.id,
      description: `سداد التزام مالي للمورد ${payment.supplierName || ''} إيصال (${payment.referenceNumber || payment.id})`,
      lines,
      createdBy: payment.settledBy || 'قسم الحسابات والمدفوعات'
    });
  }

  /**
   * Automatically posts journal entry for expired/damaged drug inventory adjustments
   */
  postInventoryDamageJournalEntry(adjustment) {
    if (!adjustment) return null;
    const costLoss = Number(adjustment.estimatedLossAmount || adjustment.quantity * 1000 || 0);
    if (costLoss <= 0) return null;

    const lines = [
      // 1. Debit Expired/Damaged losses expense (5200)
      {
        accountId: 'ACC-5200',
        debit: costLoss,
        credit: 0,
        narration: `إثبات خسائر أدوية منتهية/تالفة: ${adjustment.productName || 'دواء'} (تشغيلة: ${adjustment.batchNumber || '—'})`
      },
      // 2. Credit Inventory asset (1131)
      {
        accountId: 'ACC-1131',
        debit: 0,
        credit: costLoss,
        narration: `استبعاد المخزون التالف بموجب إذن تسوية رقابي`
      }
    ];

    return this.createJournalEntry({
      entryDate: adjustment.date || new Date().toISOString(),
      sourceModule: 'INVENTORY',
      referenceId: adjustment.id || 'ADJ-EXP',
      description: `تسوية إتلاف أدوية منتهية الصلاحية — إذن (${adjustment.id || 'جرد'})`,
      lines,
      createdBy: adjustment.authorizedBy || 'المسؤول الرقابي والصيدلي المفتش'
    });
  }

  // =========================================================================
  // 5. FINANCIAL STATEMENTS & REPORTS (القوائم المالية الصيدلانية)
  // =========================================================================

  /**
   * Generates Trial Balance (ميزان المراجعة)
   */
  getTrialBalance(asOfDate = new Date().toISOString()) {
    this.reload();
    const cutoff = new Date(asOfDate);

    // Filter posted entries up to cutoff date
    const postedEntries = this.entries.filter(e => e.status === 'POSTED' && new Date(e.entryDate) <= cutoff);

    // Aggregate debits and credits per postable account
    const accountTotals = {};
    for (const acc of this.accounts) {
      if (acc.category === 'POSTABLE') {
        accountTotals[acc.id] = {
          account: acc,
          totalDebit: 0,
          totalCredit: 0
        };
      }
    }

    for (const entry of postedEntries) {
      for (const line of entry.lines) {
        if (accountTotals[line.accountId]) {
          accountTotals[line.accountId].totalDebit += line.debit;
          accountTotals[line.accountId].totalCredit += line.credit;
        }
      }
    }

    const rows = [];
    let sumDebit = 0;
    let sumCredit = 0;

    for (const item of Object.values(accountTotals)) {
      const acc = item.account;
      const d = Math.round(item.totalDebit * 100) / 100;
      const c = Math.round(item.totalCredit * 100) / 100;

      let netDebit = 0;
      let netCredit = 0;

      if (acc.normalBalance === 'DEBIT') {
        const net = d - c;
        if (net >= 0) netDebit = net;
        else netCredit = Math.abs(net);
      } else {
        const net = c - d;
        if (net >= 0) netCredit = net;
        else netDebit = Math.abs(net);
      }

      sumDebit += netDebit;
      sumCredit += netCredit;

      rows.push({
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        nameEn: acc.nameEn,
        type: acc.type,
        normalBalance: acc.normalBalance,
        totalDebit: d,
        totalCredit: c,
        netDebit,
        netCredit
      });
    }

    // Sort by account code
    rows.sort((a, b) => a.code.localeCompare(b.code));

    const isBalanced = Math.abs(sumDebit - sumCredit) < 0.05;

    return {
      asOfDate,
      isBalanced,
      totalDebits: Math.round(sumDebit * 100) / 100,
      totalCredits: Math.round(sumCredit * 100) / 100,
      discrepancy: Math.round(Math.abs(sumDebit - sumCredit) * 100) / 100,
      rows
    };
  }

  /**
   * Generates Income Statement (قائمة الدخل والأرباح)
   */
  getIncomeStatement(startDate = '2026-01-01T00:00:00.000Z', endDate = new Date().toISOString()) {
    this.reload();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const periodEntries = this.entries.filter(e =>
      e.status === 'POSTED' &&
      new Date(e.entryDate) >= start &&
      new Date(e.entryDate) <= end
    );

    // Calculate Revenue (4000 series accounts)
    const revenueAccounts = this.accounts.filter(a => a.type === 'REVENUE' && a.category === 'POSTABLE');
    const revenueDetails = revenueAccounts.map(acc => {
      let amount = 0;
      for (const entry of periodEntries) {
        for (const line of entry.lines) {
          if (line.accountId === acc.id) {
            amount += (line.credit - line.debit); // Revenue normal is credit
          }
        }
      }
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        amount: Math.round(amount * 100) / 100
      };
    }).filter(r => r.amount !== 0);

    const totalRevenue = revenueDetails.reduce((sum, r) => sum + r.amount, 0);

    // Calculate COGS (5000 series accounts)
    const cogsAccounts = this.accounts.filter(a => a.type === 'EXPENSE' && a.code.startsWith('5') && a.category === 'POSTABLE');
    const cogsDetails = cogsAccounts.map(acc => {
      let amount = 0;
      for (const entry of periodEntries) {
        for (const line of entry.lines) {
          if (line.accountId === acc.id) {
            amount += (line.debit - line.credit); // Expense normal is debit
          }
        }
      }
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        amount: Math.round(amount * 100) / 100
      };
    }).filter(c => c.amount !== 0);

    const totalCogs = cogsDetails.reduce((sum, c) => sum + c.amount, 0);
    const grossProfit = totalRevenue - totalCogs;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Calculate Operating Expenses (6000 series accounts)
    const opexAccounts = this.accounts.filter(a => a.type === 'EXPENSE' && a.code.startsWith('6') && a.category === 'POSTABLE');
    const opexDetails = opexAccounts.map(acc => {
      let amount = 0;
      for (const entry of periodEntries) {
        for (const line of entry.lines) {
          if (line.accountId === acc.id) {
            amount += (line.debit - line.credit);
          }
        }
      }
      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        amount: Math.round(amount * 100) / 100
      };
    }).filter(o => o.amount !== 0);

    const totalOpex = opexDetails.reduce((sum, o) => sum + o.amount, 0);
    const netProfit = grossProfit - totalOpex;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      period: { startDate, endDate },
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueDetails,
      totalCogs: Math.round(totalCogs * 100) / 100,
      cogsDetails,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossProfitMargin: Math.round(grossProfitMargin * 10) / 10,
      totalOperatingExpenses: Math.round(totalOpex * 100) / 100,
      operatingExpenseDetails: opexDetails,
      netProfit: Math.round(netProfit * 100) / 100,
      netProfitMargin: Math.round(netProfitMargin * 10) / 10
    };
  }

  /**
   * Generates Balance Sheet (الميزانية العمومية)
   * Formula: Assets = Liabilities + Equity
   */
  getBalanceSheet(asOfDate = new Date().toISOString()) {
    const trialBalance = this.getTrialBalance(asOfDate);
    const incomeStatement = this.getIncomeStatement('2026-01-01T00:00:00.000Z', asOfDate);

    const assetRows = trialBalance.rows.filter(r => r.type === 'ASSET');
    const liabilityRows = trialBalance.rows.filter(r => r.type === 'LIABILITY');
    const equityRows = trialBalance.rows.filter(r => r.type === 'EQUITY');

    const totalAssets = assetRows.reduce((sum, r) => sum + (r.netDebit - r.netCredit), 0);
    const totalLiabilities = liabilityRows.reduce((sum, r) => sum + (r.netCredit - r.netDebit), 0);
    const baseEquity = equityRows.reduce((sum, r) => sum + (r.netCredit - r.netDebit), 0);

    // Current period net profit adds to retained equity
    const currentPeriodNetProfit = incomeStatement.netProfit;
    const totalEquity = baseEquity + currentPeriodNetProfit;

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isEquationBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1.0;

    return {
      asOfDate,
      isEquationBalanced,
      totalAssets: Math.round(totalAssets * 100) / 100,
      assets: assetRows,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      liabilities: liabilityRows,
      baseEquity: Math.round(baseEquity * 100) / 100,
      currentPeriodNetProfit: Math.round(currentPeriodNetProfit * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      equity: equityRows,
      totalLiabilitiesAndEquity: Math.round(totalLiabilitiesAndEquity * 100) / 100,
      variance: Math.round(Math.abs(totalAssets - totalLiabilitiesAndEquity) * 100) / 100
    };
  }

  /**
   * Generates Account Ledger Statement (كشف حساب أستاذ تفصيلي)
   */
  getGeneralLedgerAccountStatement(accountId, startDate = '2026-01-01T00:00:00.000Z', endDate = new Date().toISOString()) {
    this.reload();
    const acc = this.getAccountById(accountId);
    if (!acc) {
      throw new Error(`الحساب المحاسبي (${accountId}) غير موجود`);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const sortedEntries = [...this.entries]
      .filter(e => e.status === 'POSTED')
      .sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));

    let openingBalance = 0;
    const transactions = [];

    for (const entry of sortedEntries) {
      const entryTime = new Date(entry.entryDate);
      for (const line of entry.lines) {
        if (line.accountId === acc.id) {
          const delta = acc.normalBalance === 'DEBIT' ? (line.debit - line.credit) : (line.credit - line.debit);

          if (entryTime < start) {
            openingBalance += delta;
          } else if (entryTime <= end) {
            transactions.push({
              entryId: entry.id,
              entryNumber: entry.entryNumber,
              entryDate: entry.entryDate,
              sourceModule: entry.sourceModule,
              referenceId: entry.referenceId,
              description: entry.description,
              narration: line.narration,
              debit: line.debit,
              credit: line.credit,
              delta
            });
          }
        }
      }
    }

    let runningBalance = openingBalance;
    const itemsWithBalance = transactions.map(tx => {
      runningBalance += tx.delta;
      return {
        ...tx,
        runningBalance: Math.round(runningBalance * 100) / 100
      };
    });

    return {
      account: {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        nameEn: acc.nameEn,
        type: acc.type,
        normalBalance: acc.normalBalance
      },
      period: { startDate, endDate },
      openingBalance: Math.round(openingBalance * 100) / 100,
      closingBalance: Math.round(runningBalance * 100) / 100,
      totalDebits: Math.round(transactions.reduce((sum, t) => sum + t.debit, 0) * 100) / 100,
      totalCredits: Math.round(transactions.reduce((sum, t) => sum + t.credit, 0) * 100) / 100,
      transactions: itemsWithBalance
    };
  }
}

export const accountingRepository = new AccountingRepository();
