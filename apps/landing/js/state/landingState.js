/**
 * PharmaTech OS — Landing Page Interactive State
 * Handles Showcase active tabs and Pricing billing cycles (monthly/annual)
 */

const state = {
  activeTab: 'erp', // 'erp' | 'pos' | 'admin'
  billingCycle: 'monthly', // 'monthly' | 'annual'
  pricing: {
    monthly: {
      community: '320,000',
      standard: '850,000',
      enterprise: '1,800,000',
      periodText: 'ج.س / شهرياً'
    },
    annual: {
      community: '272,000',
      standard: '722,500',
      enterprise: '1,530,000',
      periodText: 'ج.س / شهرياً (تدفع سنوياً)'
    }
  }
};

const listeners = new Set();

function notify() {
  listeners.forEach(fn => fn({ ...state }));
}

export function getLandingState() {
  return { ...state };
}

export function setActiveTab(tabId) {
  if (state.activeTab === tabId) return;
  state.activeTab = tabId;
  notify();
}

export function setBillingCycle(cycle) {
  if (state.billingCycle === cycle) return;
  state.billingCycle = cycle;
  notify();
}

export function subscribeLandingState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
