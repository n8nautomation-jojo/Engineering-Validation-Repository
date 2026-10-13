/**
 * Navbar Component
 * Renders the sticky glass header with 100% natural logo, navigation links,
 * three-state theme mode switcher (Light/Dark/Auto), and primary CTAs.
 */

import { getTheme, setTheme, subscribeTheme } from '../state/themeState.js';

export function renderNavbar() {
  const currentTheme = getTheme();

  return `
    <header class="site-header">
      <div class="container navbar-container">
        <!-- 100% NATURAL BRAND LOGO (NO BOXES, NO WHITE PILLS, NO BORDERS) -->
        <a href="/" class="brand-link" title="PharmaTech OS">
          <img src="/pharmatech-logo.png" alt="PharmaTech OS" class="brand-logo-img">
        </a>

        <!-- NAV LINKS -->
        <nav class="nav-menu">
          <a href="#features" class="nav-link">المميزات التشغيلية</a>
          <a href="#preview" class="nav-link">معاينة المنظومة</a>
          <a href="#pricing" class="nav-link">باقات الاشتراك</a>
          <a href="#testimonials" class="nav-link">آراء الصيادلة</a>
          <a href="#faq" class="nav-link">الأسئلة الشائعة</a>
        </nav>

        <!-- ACTIONS & THEME TOGGLE -->
        <div class="nav-actions">
          <!-- Light / Dark / Auto Theme Switcher -->
          <div class="theme-switch-wrapper" role="radiogroup" aria-label="مظهر الموقع">
            <button class="theme-switch-btn ${currentTheme === 'light' ? 'active' : ''}" 
                    data-theme-btn="light" 
                    title="الوضع النهاري (فاتح)">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            </button>
            <button class="theme-switch-btn ${currentTheme === 'dark' ? 'active' : ''}" 
                    data-theme-btn="dark" 
                    title="الوضع الليلي (داكن)">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            </button>
            <button class="theme-switch-btn ${currentTheme === 'auto' ? 'active' : ''}" 
                    data-theme-btn="auto" 
                    title="الوضع التلقائي (حسب إعدادات جهازك)">
              <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
              </svg>
            </button>
          </div>

          <a href="/platform-admin/" class="btn btn-ghost btn-sm nav-desktop-only" title="لوحة المنصة المركزية">
            <span>لوحة المنصة</span>
          </a>

          <a href="/pharmacy-erp/" class="btn btn-primary btn-sm nav-desktop-only" title="دخول منظومة الصيدلية ونقطة البيع">
            <span>دخول المنظومة & POS</span>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>

          <!-- Mobile Hamburger Toggle -->
          <button class="icon-btn landing-mobile-toggle" id="landing-mobile-toggle-btn" aria-label="فتح القائمة الرئيسية" title="القائمة">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" x2="20" y1="12" y2="12"/>
              <line x1="4" x2="20" y1="6" y2="6"/>
              <line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown Navigation Drawer -->
      <div class="landing-mobile-drawer" id="landing-mobile-drawer">
        <nav class="mobile-drawer-nav">
          <a href="#features" class="mobile-nav-link">المميزات التشغيلية</a>
          <a href="#preview" class="mobile-nav-link">معاينة المنظومة</a>
          <a href="#pricing" class="mobile-nav-link">باقات الاشتراك</a>
          <a href="#testimonials" class="mobile-nav-link">آراء الصيادلة</a>
          <a href="#faq" class="mobile-nav-link">الأسئلة الشائعة</a>
          <div class="mobile-drawer-actions">
            <a href="/pharmacy-erp/" class="btn btn-primary" style="width:100%; justify-content:center;">
              دخول المنظومة & POS
            </a>
            <a href="/platform-admin/" class="btn btn-ghost" style="width:100%; justify-content:center; border:1px solid var(--border-color);">
              لوحة المنصة المركزية
            </a>
          </div>
        </nav>
      </div>
    </header>
  `;
}

export function initNavbarEvents() {
  const buttons = document.querySelectorAll('[data-theme-btn]');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-theme-btn');
      setTheme(mode);
    });
  });

  // Keep button active states in sync with theme state
  subscribeTheme((mode) => {
    buttons.forEach(btn => {
      if (btn.getAttribute('data-theme-btn') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  });

  // Mobile Drawer Toggle
  const toggleBtn = document.getElementById('landing-mobile-toggle-btn');
  const drawer = document.getElementById('landing-mobile-drawer');

  if (toggleBtn && drawer) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close when clicking on any mobile nav link
    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

