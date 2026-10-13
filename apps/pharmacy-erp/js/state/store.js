/**
 * PharmaTech — Central Reactive State Store
 * Single Source of Truth for Dashboard & Inventory Operations
 */

class Store {
  constructor() {
    this.medicines = [];
    this.sales = [];
    this.currentSession = null;
    this.chartData = {
      week: { total: 0, points: [] },
      month: { total: 0, points: [] }
    };
    this.notifications = [];

    this.activeView = 'dashboard';
    this.collapsed = false;
    this.mobile = false;
    this.dark = localStorage.getItem('pharmatech_dark') === 'true';
    this.query = '';
    this.statusFilter = 'all';
    this.page = 1;
    this.perPage = 5;
    this.chartPeriod = 'week';
    this.selectedMedicine = null;

    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  notify(event, payload) {
    this._listeners.forEach(fn => {
      try {
        fn(event, payload, this);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  setTheme(isDark) {
    this.dark = isDark;
    localStorage.setItem('pharmatech_dark', isDark);
    this.notify('THEME_CHANGED', isDark);
  }

  setActiveView(view) {
    this.activeView = view;
    this.page = 1;
    this.notify('VIEW_CHANGED', view);
  }

  setSearchQuery(q) {
    this.query = q.trim().toLowerCase();
    this.page = 1;
    this.notify('FILTER_CHANGED', { query: this.query, status: this.statusFilter });
  }

  setStatusFilter(status) {
    this.statusFilter = status;
    this.page = 1;
    this.notify('FILTER_CHANGED', { query: this.query, status: this.statusFilter });
  }

  setPage(page) {
    this.page = page;
    this.notify('PAGE_CHANGED', page);
  }

  setChartPeriod(period) {
    this.chartPeriod = period;
    this.notify('CHART_PERIOD_CHANGED', period);
  }

  setSelectedMedicine(med) {
    this.selectedMedicine = med;
    this.notify('MEDICINE_SELECTED', med);
  }

  setMedicines(medicines) {
    this.medicines = medicines;
    this.notify('MEDICINES_LOADED', medicines);
  }
}

export const appStore = new Store();
