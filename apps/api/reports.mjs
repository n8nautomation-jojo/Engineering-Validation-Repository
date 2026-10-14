/**
 * PharmaTech Core Backend — Financial & Operational Reports Repository
 * Synthesizes live authoritative data from sales, catalog, and sessions
 */

import { salesRepository } from "./sales.mjs";
import { catalogRepository } from "./catalog.mjs";
import { sessionRepository } from "./session.mjs";

class ReportsRepository {
  _filterSalesByDate(sales, startDate, endDate) {
    if (!startDate && !endDate) return sales;
    return sales.filter(s => {
      const saleDate = s.created_at ? s.created_at.split("T")[0] : "";
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });
  }

  /**
   * Comprehensive financial summary and KPIs.
   */
  getFinancialSummary(startDate = null, endDate = null) {
    const rawSales = salesRepository.getAllSales();
    const sales = this._filterSalesByDate(rawSales, startDate, endDate);
    const completedSales = sales.filter(s => s.status === "COMPLETED");
    const reversedSales = sales.filter(s => s.status === "REVERSED");

    const grossRevenue = completedSales.reduce((acc, s) => acc + Number(s.totals.total || 0), 0);
    const reversedAmount = reversedSales.reduce((acc, s) => acc + Number(s.totals.total || 0), 0);
    const netRevenue = grossRevenue - reversedAmount;

    // Payment methods breakdown
    let cashTotal = 0;
    let bankakTotal = 0;
    let cardTotal = 0;
    let insuranceTotal = 0;

    for (const sale of completedSales) {
      if (Array.isArray(sale.payments)) {
        for (const p of sale.payments) {
          const val = Number(p.amount?.value || 0);
          if (p.method === "CASH") cashTotal += val;
          else if (p.method === "BANKAK") bankakTotal += val;
          else if (p.method === "CARD") cardTotal += val;
          else if (p.method === "INSURANCE") insuranceTotal += val;
        }
      }
    }

    const totalPaid = cashTotal + bankakTotal + cardTotal + insuranceTotal;
    const avgBasket = completedSales.length > 0 ? Math.round(netRevenue / completedSales.length) : 0;

    // Items volume sold
    const totalItemsSold = completedSales.reduce((acc, s) => {
      return acc + (s.items ? s.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0);
    }, 0);

    const currentSession = sessionRepository.getCurrentSession(rawSales);

    return {
      period: startDate || endDate ? `${startDate || "البداية"} إلى ${endDate || "اليوم"}` : "CURRENT_FISCAL_CYCLE",
      currency: "SDG",
      metrics: {
        grossRevenue,
        reversedAmount,
        netRevenue,
        salesCount: completedSales.length,
        reversedCount: reversedSales.length,
        totalItemsSold,
        averageBasket: avgBasket
      },
      paymentBreakdown: {
        cash: { amount: cashTotal, percentage: totalPaid > 0 ? Math.round((cashTotal / totalPaid) * 100) : 0 },
        bankak: { amount: bankakTotal, percentage: totalPaid > 0 ? Math.round((bankakTotal / totalPaid) * 100) : 0 },
        card: { amount: cardTotal, percentage: totalPaid > 0 ? Math.round((cardTotal / totalPaid) * 100) : 0 },
        insurance: { amount: insuranceTotal, percentage: totalPaid > 0 ? Math.round((insuranceTotal / totalPaid) * 100) : 0 }
      },
      drawerStatus: {
        currentCashInDrawer: currentSession?.metrics?.expectedCash || 0,
        openingFloat: currentSession?.openingBalance || 50000,
        sessionStatus: currentSession?.status || "OPEN"
      }
    };
  }

  /**
   * Analytics breakdown by therapeutic category.
   */
  getCategoryAnalytics(startDate = null, endDate = null) {
    const rawSales = salesRepository.getAllSales();
    const sales = this._filterSalesByDate(rawSales, startDate, endDate).filter(s => s.status === "COMPLETED");
    const products = catalogRepository.getAll();

    // Map product category
    const categoryMap = {};
    for (const p of products) {
      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { category: p.category, revenue: 0, unitsSold: 0, productsCount: 0 };
      }
      categoryMap[p.category].productsCount += 1;
    }

    let totalCategoryRevenue = 0;

    for (const sale of sales) {
      if (Array.isArray(sale.items)) {
        for (const item of sale.items) {
          const product = products.find(p => p.id === item.productId);
          const cat = product?.category || "أدوية عامة";
          if (!categoryMap[cat]) {
            categoryMap[cat] = { category: cat, revenue: 0, unitsSold: 0, productsCount: 1 };
          }
          const itemRev = Number(item.lineTotal || (item.quantity * item.unitPrice) || 0);
          categoryMap[cat].revenue += itemRev;
          categoryMap[cat].unitsSold += (item.quantity || 0);
          totalCategoryRevenue += itemRev;
        }
      }
    }

    const categoriesList = Object.values(categoryMap).map(c => ({
      ...c,
      sharePercentage: totalCategoryRevenue > 0 ? Math.round((c.revenue / totalCategoryRevenue) * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue: totalCategoryRevenue,
      categories: categoriesList
    };
  }

  /**
   * Inventory safety and expiration risk analysis.
   */
  getInventoryHealth() {
    const products = catalogRepository.getAll();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const in30Days = new Date(today.getTime() + 30 * 86400000).toISOString().split("T")[0];
    const in60Days = new Date(today.getTime() + 60 * 86400000).toISOString().split("T")[0];
    const in90Days = new Date(today.getTime() + 90 * 86400000).toISOString().split("T")[0];

    let totalStockUnits = 0;
    let totalStockValue = 0;
    const lowStockItems = [];
    const expiringSoonItems = [];
    const expiredItems = [];

    for (const p of products) {
      totalStockUnits += p.totalStock;
      totalStockValue += (p.totalStock * p.price);

      if (p.totalStock <= 25) {
        lowStockItems.push({
          id: p.id,
          name: p.name,
          nameAr: p.nameAr,
          totalStock: p.totalStock,
          price: p.price,
          status: p.totalStock === 0 ? "نفد المخزون" : "مخزون حرج"
        });
      }

      if (Array.isArray(p.batches)) {
        for (const b of p.batches) {
          if (b.availableQuantity > 0) {
            if (b.expiryDate < todayStr) {
              expiredItems.push({
                productId: p.id,
                name: p.name,
                batchNumber: b.batchNumber,
                expiryDate: b.expiryDate,
                quantity: b.availableQuantity
              });
            } else if (b.expiryDate <= in90Days) {
              const daysLeft = Math.ceil((new Date(b.expiryDate) - today) / (1000 * 60 * 60 * 24));
              expiringSoonItems.push({
                productId: p.id,
                name: p.name,
                batchNumber: b.batchNumber,
                expiryDate: b.expiryDate,
                daysLeft,
                quantity: b.availableQuantity,
                urgency: b.expiryDate <= in30Days ? "CRITICAL_30" : b.expiryDate <= in60Days ? "WARNING_60" : "WATCH_90"
              });
            }
          }
        }
      }
    }

    return {
      summary: {
        totalProducts: products.length,
        totalStockUnits,
        totalStockValue,
        currency: "SDG",
        lowStockCount: lowStockItems.length,
        expiringCount: expiringSoonItems.length,
        expiredCount: expiredItems.length
      },
      lowStockItems: lowStockItems.slice(0, 10),
      expiringSoonItems: expiringSoonItems.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 10),
      expiredItems
    };
  }

  /**
   * Top selling medicines ranked by volume and revenue.
   */
  getTopSellingProducts(startDate = null, endDate = null) {
    const rawSales = salesRepository.getAllSales();
    const sales = this._filterSalesByDate(rawSales, startDate, endDate).filter(s => s.status === "COMPLETED");
    const productStats = {};

    for (const s of sales) {
      if (Array.isArray(s.items)) {
        for (const item of s.items) {
          if (!productStats[item.productId]) {
            productStats[item.productId] = {
              productId: item.productId,
              name: item.name || item.productName,
              nameAr: item.nameAr || item.name,
              totalQuantity: 0,
              totalRevenue: 0,
              salesCount: 0
            };
          }
          productStats[item.productId].totalQuantity += (item.quantity || 0);
          productStats[item.productId].totalRevenue += Number(item.lineTotal || (item.quantity * item.unitPrice) || 0);
          productStats[item.productId].salesCount += 1;
        }
      }
    }

    return Object.values(productStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);
  }
}

export const reportsRepository = new ReportsRepository();
