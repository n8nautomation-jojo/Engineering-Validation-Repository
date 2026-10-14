/**
 * PharmaTech — Enterprise Backend API Client
 * Manages HTTP communication with the Core Backend Server
 * Injects Correlation IDs, Idempotency Keys, and Standard Error Normalization
 */

class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  generateCorrelationId() {
    return `corr-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  generateIdempotencyKey() {
    return `idemp-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-Correlation-Id': options.correlationId || this.generateCorrelationId(),
      ...(options.headers || {})
    };

    if (this.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.dto = data;
        throw err;
      }

      return data;
    } catch (err) {
      console.error(`[API Client Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body,
      idempotencyKey: options.idempotencyKey || this.generateIdempotencyKey()
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body,
      idempotencyKey: options.idempotencyKey || this.generateIdempotencyKey()
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
