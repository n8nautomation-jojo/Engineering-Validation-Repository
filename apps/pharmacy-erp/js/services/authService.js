/**
 * PharmaTech — Authentication & Session Client Service
 * Manages user sessions, bearer tokens, auto-login hydration, and security events
 */

import { apiClient } from './apiClient.js';
import { showToast } from '../components/Toast.js';

const TOKEN_STORAGE_KEY = 'PHARMATECH_AUTH_TOKEN';
const USER_STORAGE_KEY = 'PHARMATECH_AUTH_USER';

export class AuthService {
  static _currentUser = null;
  static _token = null;

  static init() {
    try {
      if (typeof window === 'undefined') return;
      const sess = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
      const local = typeof localStorage !== 'undefined' ? localStorage : null;
      const storedToken = sess?.getItem(TOKEN_STORAGE_KEY) || local?.getItem(TOKEN_STORAGE_KEY);
      const storedUser = sess?.getItem(USER_STORAGE_KEY) || local?.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        this._token = storedToken;
        this._currentUser = JSON.parse(storedUser);
        apiClient.setToken(storedToken);
      }
    } catch (err) {
      console.warn('[AuthService] Failed to load stored session:', err);
    }
  }

  static isAuthenticated() {
    return Boolean(this._token && this._currentUser);
  }

  static getCurrentUser() {
    return this._currentUser;
  }

  static getToken() {
    return this._token;
  }

  /**
   * RBAC Role and Capability Helpers (ADR-013 / Least Privilege)
   */
  static getRole() {
    return this._currentUser?.role || null;
  }

  static isManager() {
    return this._currentUser?.role === 'PHARMACY_MANAGER';
  }

  static isCashier() {
    return this._currentUser?.role === 'CASHIER';
  }

  static hasCapability(capability) {
    if (!this._currentUser) return false;
    if (this._currentUser.role === 'PHARMACY_MANAGER') return true;
    const caps = this._currentUser.capabilities || [];
    return caps.includes(capability);
  }

  static getAllowedViews() {
    if (!this._currentUser) return ['pos'];
    const role = this._currentUser.role;
    if (role === 'CASHIER') {
      return ['pos', 'sales', 'sessions', 'customers'];
    }
    // PHARMACY_MANAGER and default admin roles
    return ['dashboard', 'inventory', 'pos', 'sales', 'sessions', 'purchasing', 'customers', 'reports', 'design-system'];
  }

  static canAccessView(view) {
    return this.getAllowedViews().includes(view);
  }

  static getDefaultView() {
    if (this.isCashier()) return 'pos';
    return 'dashboard';
  }

  /**
   * Authenticate user with backend
   */
  static async login(username, password, tenantCode = '', rememberMe = true) {
    try {
      const result = await apiClient.post('/api/auth/login', {
        username: username.trim(),
        password,
        tenantCode: tenantCode.trim()
      });

      if (result.requirePasswordChange) {
        return {
          requirePasswordChange: true,
          tempToken: result.tempToken,
          user: result.user,
          message: result.message
        };
      }

      this._token = result.token;
      this._currentUser = result.user;
      apiClient.setToken(result.token);

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem(TOKEN_STORAGE_KEY, result.token);
      storage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));

      window.dispatchEvent(new CustomEvent('AUTH_STATE_CHANGED', {
        detail: { isAuthenticated: true, user: result.user }
      }));

      return {
        requirePasswordChange: false,
        user: result.user,
        token: result.token
      };
    } catch (err) {
      console.error('[AuthService] Login failed:', err);
      throw err;
    }
  }

  /**
   * Mandatory password change workflow for new provisioned accounts (ADR-013)
   */
  static async changePassword(tempToken, newPassword, confirmPassword) {
    try {
      const result = await apiClient.post('/api/auth/change-password', {
        tempToken,
        newPassword,
        confirmPassword
      });

      this._token = result.token;
      this._currentUser = result.user;
      apiClient.setToken(result.token);

      localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));

      window.dispatchEvent(new CustomEvent('AUTH_STATE_CHANGED', {
        detail: { isAuthenticated: true, user: result.user }
      }));

      return result;
    } catch (err) {
      console.error('[AuthService] Change password failed:', err);
      throw err;
    }
  }

  /**
   * Check session validity with backend /api/auth/me
   */
  static async verifySession() {
    if (!this._token) return false;
    try {
      const result = await apiClient.get('/api/auth/me');
      if (result?.user) {
        this._currentUser = result.user;
        return true;
      }
      return false;
    } catch {
      this.clearLocalSession();
      return false;
    }
  }

  /**
   * Terminate active session
   */
  static async logout() {
    try {
      if (this._token) {
        await apiClient.post('/api/auth/logout', {});
      }
    } catch (err) {
      console.warn('[AuthService] Remote logout failed or offline:', err);
    } finally {
      this.clearLocalSession();
      window.dispatchEvent(new CustomEvent('AUTH_STATE_CHANGED', {
        detail: { isAuthenticated: false, user: null }
      }));
      showToast('تم تسجيل الخروج', 'تم قفل الجلسة بنجاح للحفاظ على أمان المنظومة', 'info');
    }
  }

  static clearLocalSession() {
    this._token = null;
    this._currentUser = null;
    apiClient.setToken(null);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

AuthService.init();
