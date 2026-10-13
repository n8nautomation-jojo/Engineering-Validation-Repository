/**
 * PharmaTech Core Backend — Cash Sessions & Z-Report Domain Repository
 * Strictly conforms to src/domain/cash/cash-session.ts & OpenAPI 3.1 Cash Session Contracts
 */

import { randomUUID } from "node:crypto";

class SessionRepository {
  constructor() {
    this.session = {
      cashRegisterId: "018f0000-0000-7000-8000-000000000001",
      cashSessionId: "018f0000-0000-7000-8000-000000000002",
      cashierId: "usr-001",
      cashierName: "د. أحمد الطاهر",
      branchId: "brn-khartoum-01",
      branchName: "صيدلية النيلين النموذجية — فرع الخرطوم الرئيسي",
      taxRegistrationNumber: "TRN-10294819",
      status: "OPEN",
      openedAt: "2026-10-13T08:00:00.000Z",
      openingBalance: 50000,
      currency: "SDG",
      movements: [
        {
          id: "mov-001",
          type: "OPENING_FLOAT",
          amount: { value: "50000.00", currency: "SDG" },
          occurredAt: "2026-10-13T08:00:00.000Z",
          reason: "الرصيد الافتتاحي لبداية الوردية"
        }
      ]
    };

    this.pastSessions = [
      {
        cashRegisterId: "018f0000-0000-7000-8000-000000000001",
        cashSessionId: "018f0000-0000-7000-8000-000000000001",
        cashierId: "usr-002",
        cashierName: "د. سارة المنصور",
        branchId: "brn-khartoum-01",
        branchName: "صيدلية النيلين النموذجية — فرع الخرطوم الرئيسي",
        taxRegistrationNumber: "TRN-10294819",
        status: "CLOSED",
        openedAt: "2026-10-12T08:00:00.000Z",
        closedAt: "2026-10-12T16:30:00.000Z",
        openingBalance: 50000,
        currency: "SDG",
        metrics: {
          openingFloat: 50000,
          cashSales: 320000,
          bankakSales: 215000,
          cardSales: 0,
          cashIn: 0,
          cashOut: 15000,
          expectedCash: 355000,
          countedCash: 355000,
          variance: 0,
          totalRevenue: 535000,
          salesCount: 42
        },
        zReport: {
          zReportNumber: "Z-2026-1041",
          closedAt: "2026-10-12T16:30:00.000Z",
          status: "BALANCED"
        }
      }
    ];

    this.allocation = {
      deviceId: "pos-dev-01",
      totalCapacity: 100,
      consumedCapacity: 20
    };
  }

  calculateMetrics(session, salesList = []) {
    if (!session) return null;

    const sessionSales = salesList.filter(s =>
      s.status === "COMPLETED" && (s.cash_session_id === session.cashSessionId || !s.cash_session_id)
    );

    let cashSales = 0;
    let bankakSales = 0;
    let cardSales = 0;

    for (const s of sessionSales) {
      for (const p of (s.payments || [])) {
        const amt = parseFloat(p.amount?.value || p.amount || 0);
        if (p.method === "CASH") cashSales += amt;
        else if (p.method === "BANK_TRANSFER" || p.method === "BANKAK") bankakSales += amt;
        else if (p.method === "CARD") cardSales += amt;
      }
    }

    let cashIn = 0;
    let cashOut = 0;
    for (const m of (session.movements || [])) {
      const val = parseFloat(m.amount?.value || m.amount || 0);
      if (m.type === "CASH_IN") cashIn += val;
      else if (m.type === "CASH_OUT") cashOut += val;
    }

    const openingFloat = parseFloat(session.openingBalance || 0);
    const expectedCash = openingFloat + cashSales + cashIn - cashOut;
    const totalRevenue = cashSales + bankakSales + cardSales;

    return {
      openingFloat,
      cashSales,
      bankakSales,
      cardSales,
      cashIn,
      cashOut,
      expectedCash,
      totalRevenue,
      salesCount: sessionSales.length
    };
  }

  getCurrentSession(salesList = []) {
    const metrics = this.calculateMetrics(this.session, salesList);
    return {
      ...this.session,
      metrics
    };
  }

  getAllSessions(salesList = []) {
    return {
      current: this.getCurrentSession(salesList),
      history: [...this.pastSessions]
    };
  }

  getAllocationStatus() {
    const remaining = Math.max(0, this.allocation.totalCapacity - this.allocation.consumedCapacity);
    return {
      deviceId: this.allocation.deviceId,
      totalCapacity: this.allocation.totalCapacity,
      consumedCapacity: this.allocation.consumedCapacity,
      remainingCapacity: remaining
    };
  }

  consumeAllocation(units) {
    this.allocation.consumedCapacity = Math.min(
      this.allocation.totalCapacity,
      this.allocation.consumedCapacity + units
    );
    return this.getAllocationStatus();
  }

  addCashMovement(sessionId, input) {
    if (!this.session || this.session.status !== "OPEN") {
      throw new Error("CASH_SESSION_NOT_OPEN: لا توجد وردية مفتوحة لتسجيل الحركة");
    }

    const amt = parseFloat(input.amount);
    if (isNaN(amt) || amt <= 0) {
      throw new Error("INVALID_AMOUNT: يجب أن يكون المبلغ موجباً");
    }

    const type = input.type === "CASH_IN" ? "CASH_IN" : "CASH_OUT";
    const movement = {
      id: `mov-${randomUUID().slice(0, 8)}`,
      type,
      amount: { value: amt.toFixed(2), currency: "SDG" },
      occurredAt: new Date().toISOString(),
      reason: input.reason || (type === "CASH_IN" ? "إيداع نقدي إضافي" : "سحب مصروفات ونثريات")
    };

    this.session.movements.push(movement);
    return movement;
  }

  closeSession(sessionId, countedCash, note = "", salesList = []) {
    if (!this.session || this.session.status !== "OPEN") {
      throw new Error("CASH_SESSION_NOT_OPEN: الوردية غير مفتوحة");
    }

    const metrics = this.calculateMetrics(this.session, salesList);
    const counted = parseFloat(countedCash);
    if (isNaN(counted) || counted < 0) {
      throw new Error("INVALID_COUNTED_CASH: يجب إدخال نقدية الدرج الفعلية");
    }

    const variance = Number((counted - metrics.expectedCash).toFixed(2));
    const closedAt = new Date().toISOString();
    const zReportNumber = `Z-2026-${String(this.pastSessions.length + 1042).padStart(4, "0")}`;

    const zReport = {
      zReportNumber,
      cashSessionId: this.session.cashSessionId,
      cashRegisterId: this.session.cashRegisterId,
      branchName: this.session.branchName,
      taxRegistrationNumber: this.session.taxRegistrationNumber,
      cashierName: this.session.cashierName,
      openedAt: this.session.openedAt,
      closedAt,
      openingFloat: metrics.openingFloat,
      cashSales: metrics.cashSales,
      bankakSales: metrics.bankakSales,
      cardSales: metrics.cardSales,
      totalRevenue: metrics.totalRevenue,
      cashIn: metrics.cashIn,
      cashOut: metrics.cashOut,
      expectedCash: metrics.expectedCash,
      countedCash: counted,
      variance,
      salesCount: metrics.salesCount,
      status: variance === 0 ? "BALANCED" : variance < 0 ? "SHORTAGE" : "SURPLUS",
      note: note || ""
    };

    const archivedSession = {
      ...this.session,
      status: "CLOSED",
      closedAt,
      countedCash: counted,
      variance,
      metrics: {
        ...metrics,
        countedCash: counted,
        variance
      },
      zReport
    };

    this.pastSessions.unshift(archivedSession);
    this.session = null; // No open session now

    return {
      session: archivedSession,
      zReport
    };
  }

  openNewSession(input) {
    if (this.session && this.session.status === "OPEN") {
      throw new Error("CASH_SESSION_ALREADY_OPEN: توجد وردية مفتوحة بالفعل. يرجى إغلاقها أولاً");
    }

    const openingFloat = parseFloat(input.openingFloat || 50000);
    const cashierName = input.cashierName || "د. أحمد الطاهر";
    const now = new Date().toISOString();

    this.session = {
      cashRegisterId: input.cashRegisterId || "018f0000-0000-7000-8000-000000000001",
      cashSessionId: `018f-${randomUUID()}`,
      cashierId: input.cashierId || "usr-001",
      cashierName,
      branchId: "brn-khartoum-01",
      branchName: "صيدلية النيلين النموذجية — فرع الخرطوم الرئيسي",
      taxRegistrationNumber: "TRN-10294819",
      status: "OPEN",
      openedAt: now,
      openingBalance: openingFloat,
      currency: "SDG",
      movements: [
        {
          id: `mov-${randomUUID().slice(0, 8)}`,
          type: "OPENING_FLOAT",
          amount: { value: openingFloat.toFixed(2), currency: "SDG" },
          occurredAt: now,
          reason: input.note || "الرصيد الافتتاحي لبداية الوردية"
        }
      ]
    };

    return this.getCurrentSession([]);
  }
}

export const sessionRepository = new SessionRepository();
