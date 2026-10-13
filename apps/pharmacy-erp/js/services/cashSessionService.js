/**
 * PharmaTech — Cash Session & Drawer Management Domain Service
 * Encapsulates session lifecycles, cash in/out movements, shift reconciliation and Z-Reports
 */

import { apiClient } from './apiClient.js';

class CashSessionService {
  constructor() {
    this.currentSession = null;
    this.history = [];
    this.isLoading = false;
  }

  async fetchCurrentSession() {
    try {
      this.currentSession = await apiClient.get('/api/sessions/current');
      return this.currentSession;
    } catch (err) {
      console.warn('[CashSessionService] Failed to fetch current session:', err.message);
      return null;
    }
  }

  async fetchAllSessions() {
    try {
      const data = await apiClient.get('/api/sessions');
      if (data) {
        this.currentSession = data.current;
        this.history = data.history || [];
      }
      return data;
    } catch (err) {
      console.warn('[CashSessionService] Failed to fetch sessions history:', err.message);
      return { current: this.currentSession, history: this.history };
    }
  }

  async recordMovement(type, amount, reason) {
    if (!this.currentSession || this.currentSession.status !== 'OPEN') {
      throw new Error('لا توجد وردية مفتوحة لتسجيل الحركة النقدية');
    }

    const payload = {
      sessionId: this.currentSession.cashSessionId,
      type,
      amount: Number(amount),
      reason
    };

    const movement = await apiClient.post('/api/sessions/movement', payload);
    await this.fetchAllSessions();
    window.dispatchEvent(new CustomEvent('SESSION_UPDATED'));
    return movement;
  }

  async closeSession(countedCash, note = '') {
    if (!this.currentSession || this.currentSession.status !== 'OPEN') {
      throw new Error('الوردية غير مفتوحة لإغلاقها');
    }

    const payload = {
      sessionId: this.currentSession.cashSessionId,
      countedCash: Number(countedCash),
      note
    };

    const result = await apiClient.post('/api/sessions/close', payload);
    await this.fetchAllSessions();
    window.dispatchEvent(new CustomEvent('SESSION_UPDATED'));
    return result;
  }

  async openSession(openingFloat, cashierName = 'د. أحمد الطاهر', note = '') {
    const payload = {
      openingFloat: Number(openingFloat),
      cashierName,
      note
    };

    const newSession = await apiClient.post('/api/sessions/open', payload);
    await this.fetchAllSessions();
    window.dispatchEvent(new CustomEvent('SESSION_UPDATED'));
    return newSession;
  }
}

export const cashSessionService = new CashSessionService();
