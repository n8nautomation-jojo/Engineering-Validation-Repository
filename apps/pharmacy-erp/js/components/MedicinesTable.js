/**
 * PharmaTech — Inventory Table & FEFO Grid Component
 * Clinical data visualization with FEFO indicators, status filters & reactive pagination
 */

import { appStore } from '../state/store.js';
import { MedicineService } from '../services/medicineService.js';

export class MedicinesTable {
  constructor() {
    this.tbody = document.getElementById('medicines-table-tbody');
    this.tableSearch = document.getElementById('table-filter-search');
    this.segmentedButtons = document.querySelectorAll('#filter-status-segmented button');
    this.prevBtn = document.getElementById('pagination-prev-btn');
    this.nextBtn = document.getElementById('pagination-next-btn');
    this.countChip = document.getElementById('table-count-chip');
    this.paginationInfo = document.getElementById('table-pagination-info');
    this.pagesContainer = document.getElementById('pagination-pages-container');

    this.init();
  }

  init() {
    // Segmented Status Filters
    this.segmentedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const st = btn.dataset.status;
        appStore.setStatusFilter(st);
        this.updateSegmentedUI(st);
      });
    });

    // Table Local Search
    if (this.tableSearch) {
      this.tableSearch.addEventListener('input', (e) => {
        appStore.setSearchQuery(e.target.value);
      });
    }

    // Pagination
    this.prevBtn?.addEventListener('click', () => {
      if (appStore.page > 1) {
        appStore.setPage(appStore.page - 1);
      }
    });

    this.nextBtn?.addEventListener('click', () => {
      const totalPages = Math.ceil(MedicineService.getFiltered().length / appStore.perPage) || 1;
      if (appStore.page < totalPages) {
        appStore.setPage(appStore.page + 1);
      }
    });

    // Subscribe to store updates
    appStore.subscribe((event) => {
      if ([
        'MEDICINES_LOADED',
        'FILTER_CHANGED',
        'PAGE_CHANGED',
        'MEDICINE_ADDED',
        'MEDICINE_DELETED',
        'VIEW_CHANGED'
      ].includes(event)) {
        this.render();
      }
    });

    // Initial render
    this.render();
  }

  updateSegmentedUI(activeStatus) {
    this.segmentedButtons.forEach(b => {
      b.dataset.active = b.dataset.status === activeStatus ? 'true' : 'false';
    });
  }

  render() {
    if (!this.tbody) return;

    this.updateSegmentedUI(appStore.statusFilter);

    const filtered = MedicineService.getFiltered();
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / appStore.perPage));
    appStore.page = Math.min(appStore.page, pages);

    const start = (appStore.page - 1) * appStore.perPage;
    const rows = filtered.slice(start, start + appStore.perPage);

    if (this.countChip) this.countChip.textContent = total;
    if (this.paginationInfo) {
      this.paginationInfo.textContent = total > 0
        ? `${start + 1}–${Math.min(start + appStore.perPage, total)} / ${total} صنفاً`
        : '0 / 0';
    }

    this.renderPaginationButtons(pages);

    if (rows.length === 0) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding: 40px; color:var(--muted-foreground);">
            <div style="display:grid; place-items:center; gap:8px;">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
              <span>لم يتم العثور على أي أدوية مطابقة</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    this.tbody.innerHTML = rows.map(m => {
      const pct = Math.min(100, Math.round((m.stock / m.maxStock) * 100));

      let statusLabel = 'متوفر';
      let statusClass = 'available';
      if (m.status === 'low') {
        statusLabel = 'منخفض';
        statusClass = 'low';
      } else if (m.status === 'expiring') {
        statusLabel = 'ينتهي قريباً';
        statusClass = 'expiring';
      } else if (m.status === 'expired') {
        statusLabel = 'محظور (منتهي)';
        statusClass = 'expired';
      }

      return `
        <tr onclick="window.openMedicineDetail('${m.id}')">
          <td>
            <div class="medicine-name">
              <div class="medicine-icon ${statusClass}">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
              </div>
              <div>
                <strong>${m.name}</strong>
                <small dir="ltr">${m.generic}</small>
              </div>
            </div>
          </td>
          <td>
            <span class="tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg>
              ${m.category}
            </span>
          </td>
          <td>
            <div class="stock">
              <span class="num">${m.stock}</span>
              <div class="meter">
                <i class="${statusClass}" style="width: ${pct}%"></i>
              </div>
            </div>
          </td>
          <td>
            <strong class="num" dir="ltr">${Number(m.price).toLocaleString()} ج.س</strong>
          </td>
          <td>
            <span class="date num" dir="ltr">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              ${m.expiry}
            </span>
          </td>
          <td>
            <span class="num" style="font-size:11.5px; font-weight:700; background:var(--muted); padding:3px 7px; border-radius:6px; border:1px solid var(--border);" dir="ltr">
              ${m.batch}
            </span>
          </td>
          <td>
            <span class="status ${statusClass}">
              ${statusLabel}
            </span>
          </td>
          <td>
            <button class="icon-btn" title="تفاصيل الصنف" onclick="event.stopPropagation(); window.openMedicineDetail('${m.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderPaginationButtons(totalPages) {
    if (!this.pagesContainer) return;

    this.pagesContainer.innerHTML = Array.from({ length: totalPages }, (_, i) => {
      const pageNum = i + 1;
      return `
        <button class="page-btn" data-active="${appStore.page === pageNum}" onclick="window.setPage(${pageNum})">
          ${pageNum}
        </button>
      `;
    }).join('');
  }
}
