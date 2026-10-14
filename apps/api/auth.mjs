/**
 * PharmaTech Core Backend — Enterprise Authentication & Security Repository
 * Conforms strictly to ADR-013, D-041, and IdentityLifecycle (src/authorization/identity-lifecycle.ts)
 * Built with defense-in-depth:
 * 1. SQL Injection / Payload sanitization guards
 * 2. Scrypt salted password hashing with constant-time verification (timing attack immune)
 * 3. Rate limiting and brute-force throttling with automatic lockout
 * 4. First-login password change enforcement (PASSWORD_CHANGE_REQUIRED)
 * 5. Cryptographically secure random session tokens (AES-compatible 256-bit entropy)
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const resolveDataDir = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.url && typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
      return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
    }
  } catch {}
  return "";
};

const DATA_DIR = resolveDataDir();
const USERS_FILE = DATA_DIR ? path.join(DATA_DIR, "users.json") : "";

// Security Constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours active session
const TEMP_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 mins to change password

// Regex to catch malicious SQL injection sequences and shell injection attempts
const SQL_INJECTION_PATTERN = /('|--|;|\/\*|\*\/|\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|XP_)\b)/i;
const SAFE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_\-.@]+$/;

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function timingSafeVerify(password, salt, storedHash) {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const bufA = Buffer.from(computedHash, "hex");
    const bufB = Buffer.from(storedHash, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function isTenantSuspended(tenantCode) {
  if (!tenantCode || !DATA_DIR) return false;
  try {
    const tenantsPath = path.join(DATA_DIR, "tenants.json");
    if (fs && typeof fs.existsSync === "function" && fs.existsSync(tenantsPath)) {
      const tenants = JSON.parse(fs.readFileSync(tenantsPath, "utf-8"));
      const t = tenants.find(x => x.tenantCode && x.tenantCode.toUpperCase() === tenantCode.toUpperCase());
      return Boolean(t && t.status === "SUSPENDED");
    }
  } catch {}
  return false;
}

// Initial Seed Users
const DEFAULT_USERS_SEED = [
  {
    id: "usr-001",
    username: "ahmed_pharma",
    fullName: "د. أحمد الطاهر",
    role: "PHARMACY_MANAGER",
    roleNameAr: "صيدلي مسؤول / مدير الصيدلية",
    tenantCode: "PHARMA-NILEIN",
    branchId: "brn-khartoum-01",
    branchName: "فرع الخرطوم الرئيسي",
    salt: "e4f8a19c3b52d7e01479f6a8b2c5e3d1",
    passwordHash: hashPassword("Password@2026", "e4f8a19c3b52d7e01479f6a8b2c5e3d1"),
    status: "ACTIVE", // ACTIVE | PASSWORD_CHANGE_REQUIRED | LOCKED | DISABLED
    capabilities: ["sales.create", "sales.read", "sales.reverse", "inventory.manage", "reports.view", "settings.manage"],
    createdAt: "2026-09-01T10:00:00Z"
  },
  {
    id: "usr-002",
    username: "sara_cashier",
    fullName: "د. سارة الكباشي",
    role: "CASHIER",
    roleNameAr: "صيدلي كاشير / بيع سريع",
    tenantCode: "PHARMA-NILEIN",
    branchId: "brn-khartoum-01",
    branchName: "فرع الخرطوم الرئيسي",
    salt: "a1c2e3f4b5d6a7b8c9d0e1f2a3b4c5d6",
    passwordHash: hashPassword("Password@2026", "a1c2e3f4b5d6a7b8c9d0e1f2a3b4c5d6"),
    status: "ACTIVE",
    capabilities: ["sales.create", "sales.read", "cash.shift"],
    createdAt: "2026-09-15T14:30:00Z"
  },
  {
    id: "usr-003",
    username: "bluenile_admin",
    fullName: "د. محمد علي — النيل الأزرق",
    role: "PHARMACY_MANAGER",
    roleNameAr: "مدير صيدلية (حساب جديد)",
    tenantCode: "PHARMA-BLUENILE",
    branchId: "brn-bahri-01",
    branchName: "فرع بحري المحطة الوسطى",
    salt: "9f8e7d6c5b4a3a2b1c0d1e2f3a4b5c6d",
    passwordHash: hashPassword("Temp-9K22!2026", "9f8e7d6c5b4a3a2b1c0d1e2f3a4b5c6d"),
    status: "PASSWORD_CHANGE_REQUIRED", // Demonstrates mandatory first-login password change
    capabilities: ["sales.create", "sales.read", "inventory.manage", "reports.view"],
    createdAt: "2026-10-10T11:20:00Z"
  }
];

class AuthRepository {
  constructor() {
    this.users = this.loadUsers();
    this.sessions = new Map(); // token -> sessionData
    this.rateLimits = new Map(); // identifier -> { failedCount, lockedUntil }
  }

  loadUsers() {
    try {
      if (USERS_FILE && fs && typeof fs.existsSync === "function" && fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[AuthRepository] Failed to read users from disk, using seed:", err.message);
    }
    this.persistUsers(DEFAULT_USERS_SEED);
    return DEFAULT_USERS_SEED;
  }

  persistUsers(usersList) {
    try {
      if (!DATA_DIR || !USERS_FILE || !fs || typeof fs.writeFileSync !== "function") return;
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(USERS_FILE, JSON.stringify(usersList, null, 2), "utf-8");
    } catch (err) {
      console.warn("[AuthRepository] Failed to write users to disk:", err.message);
    }
  }

  /**
   * Sanitizes and verifies user input to strictly prevent SQL Injection and command injection.
   */
  sanitizeInput(value, fieldName = "input") {
    if (typeof value !== "string") {
      throw new Error(`VALIDATION_ERROR: ${fieldName} must be a valid string`);
    }
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`VALIDATION_ERROR: ${fieldName} cannot be empty`);
    }

    if (SQL_INJECTION_PATTERN.test(trimmed)) {
      console.warn(`[SECURITY ALERT] SQL injection attempt detected in ${fieldName}: "${trimmed}"`);
      throw new Error("SECURITY_VIOLATION: Invalid characters or SQL injection syntax detected");
    }

    if (fieldName === "username" || fieldName === "tenantCode") {
      if (!SAFE_IDENTIFIER_PATTERN.test(trimmed)) {
        throw new Error(`VALIDATION_ERROR: ${fieldName} contains illegal characters`);
      }
    }

    return trimmed;
  }

  checkRateLimit(key) {
    const record = this.rateLimits.get(key);
    if (!record) return;

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      const remainingSecs = Math.ceil((record.lockedUntil - Date.now()) / 1000);
      throw new Error(`ACCOUNT_LOCKED_TEMPORARILY: Too many failed attempts. Try again in ${remainingSecs} seconds.`);
    }

    // Reset lockout if expired
    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
      this.rateLimits.delete(key);
    }
  }

  recordFailedAttempt(key) {
    const record = this.rateLimits.get(key) || { failedCount: 0, lockedUntil: null };
    record.failedCount += 1;
    if (record.failedCount >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      console.warn(`[SECURITY LOCK] Target "${key}" locked for 15 minutes due to consecutive failures.`);
    }
    this.rateLimits.set(key, record);
  }

  clearRateLimit(key) {
    this.rateLimits.delete(key);
  }

  /**
   * Enterprise Login Method
   */
  login(rawUsername, rawPassword, rawTenantCode = "", ipAddress = "127.0.0.1") {
    const username = this.sanitizeInput(rawUsername, "username");
    const password = this.sanitizeInput(rawPassword, "password");
    const tenantCode = rawTenantCode ? this.sanitizeInput(rawTenantCode, "tenantCode") : null;

    const rateKey = `${ipAddress}:${username.toLowerCase()}`;
    this.checkRateLimit(rateKey);

    // Constant-time search protection:
    // If user does not exist, compute a dummy hash anyway to prevent timing enumeration
    const user = this.users.find(u => {
      const matchesUsername = u.username.toLowerCase() === username.toLowerCase();
      if (!tenantCode) return matchesUsername;
      return matchesUsername && u.tenantCode.toUpperCase() === tenantCode.toUpperCase();
    });

    const salt = user ? user.salt : "00000000000000000000000000000000";
    const storedHash = user ? user.passwordHash : hashPassword("dummy_timing_padding", salt);

    const isMatch = timingSafeVerify(password, salt, storedHash);

    if (!user || !isMatch) {
      this.recordFailedAttempt(rateKey);
      throw new Error("INVALID_CREDENTIALS: اسم المستخدم أو كلمة المرور غير صحيحة");
    }

    // Check Tenant Suspension (D-038 Platform Policy)
    if (user.tenantCode && isTenantSuspended(user.tenantCode)) {
      throw new Error("ACCOUNT_LOCKED: تم تعليق اشتراك هذه الصيدلية من قبل إدارة المنصة المركزية. يرجى التواصل مع الدعم الفني.");
    }

    // Check account status
    if (user.status === "LOCKED") {
      throw new Error("ACCOUNT_LOCKED: هذا الحساب مقفل لدواعي أمنية. يرجى مراجعة إدارة المنصة.");
    }
    if (user.status === "DISABLED") {
      throw new Error("ACCOUNT_DISABLED: هذا الحساب معطل حالياً من قِبل المشرف.");
    }

    // Successful login: clear failed attempts
    this.clearRateLimit(rateKey);

    // Handle First-Login Lifecycle (ADR-013)
    if (user.status === "PASSWORD_CHANGE_REQUIRED") {
      const tempToken = `temp-${crypto.randomBytes(24).toString("hex")}`;
      this.sessions.set(tempToken, {
        userId: user.id,
        username: user.username,
        role: user.role,
        isTemp: true,
        expiresAt: Date.now() + TEMP_TOKEN_EXPIRY_MS
      });

      return {
        requirePasswordChange: true,
        tempToken,
        message: "يجب تغيير كلمة المرور المؤقتة فوراً قبل استخدام النظام",
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          roleNameAr: user.roleNameAr,
          tenantCode: user.tenantCode,
          branchName: user.branchName
        }
      };
    }

    // Generate secure cryptographically random bearer session token
    const token = `pharma_sess_${crypto.randomBytes(32).toString("hex")}`;
    const sessionData = {
      token,
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      roleNameAr: user.roleNameAr,
      tenantCode: user.tenantCode,
      branchId: user.branchId,
      branchName: user.branchName,
      capabilities: user.capabilities,
      isTemp: false,
      loginAt: new Date().toISOString(),
      expiresAt: Date.now() + SESSION_EXPIRY_MS
    };

    this.sessions.set(token, sessionData);

    return {
      token,
      requirePasswordChange: false,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        roleNameAr: user.roleNameAr,
        tenantCode: user.tenantCode,
        branchId: user.branchId,
        branchName: user.branchName,
        capabilities: user.capabilities
      }
    };
  }

  /**
   * Mandatory Password Change Workflow (D-041)
   */
  changePassword(tempToken, rawNewPassword, rawConfirmPassword) {
    if (!tempToken || !this.sessions.has(tempToken)) {
      throw new Error("UNAUTHORIZED: رمز الجلسة المؤقتة غير صالح أو منتهي الصلاحية");
    }

    const session = this.sessions.get(tempToken);
    if (!session.isTemp || Date.now() > session.expiresAt) {
      this.sessions.delete(tempToken);
      throw new Error("TOKEN_EXPIRED: انتهت صلاحية الجلسة المؤقتة. يرجى تسجيل الدخول مجدداً");
    }

    const newPassword = this.sanitizeInput(rawNewPassword, "newPassword");
    const confirmPassword = this.sanitizeInput(rawConfirmPassword, "confirmPassword");

    if (newPassword !== confirmPassword) {
      throw new Error("VALIDATION_ERROR: كلمة المرور الجديدة وتأكيدها غير متطابقين");
    }

    if (newPassword.length < 8) {
      throw new Error("VALIDATION_ERROR: كلمة المرور يجب ألا تقل عن 8 أحرف وأرقام معقدة");
    }

    const user = this.users.find(u => u.id === session.userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    // Generate new salt and hash
    const newSalt = generateSalt();
    const newHash = hashPassword(newPassword, newSalt);

    user.salt = newSalt;
    user.passwordHash = newHash;
    user.status = "ACTIVE";
    user.passwordChangedAt = new Date().toISOString();

    this.persistUsers(this.users);
    this.sessions.delete(tempToken); // Invalidate temporary token immediately

    // Issue standard active token
    const token = `pharma_sess_${crypto.randomBytes(32).toString("hex")}`;
    const activeSession = {
      token,
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      roleNameAr: user.roleNameAr,
      tenantCode: user.tenantCode,
      branchId: user.branchId,
      branchName: user.branchName,
      capabilities: user.capabilities,
      isTemp: false,
      loginAt: new Date().toISOString(),
      expiresAt: Date.now() + SESSION_EXPIRY_MS
    };

    this.sessions.set(token, activeSession);

    return {
      token,
      message: "تم تغيير كلمة المرور بنجاح وتفعيل الحساب",
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        roleNameAr: user.roleNameAr,
        tenantCode: user.tenantCode,
        branchName: user.branchName
      }
    };
  }

  /**
   * Validates active session token
   */
  validateToken(token) {
    if (!token || typeof token !== "string") return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Explicit Logout / Revocation
   */
  logout(token) {
    if (token) {
      this.sessions.delete(token);
    }
    return { success: true, message: "تم تسجيل الخروج بنجاح" };
  }
}

export const authRepository = new AuthRepository();
