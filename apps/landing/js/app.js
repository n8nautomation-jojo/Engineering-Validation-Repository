/**
 * PharmaTech OS — Landing Page Application Bootstrap
 * Orchestrates modular components, reactive state, theme switching, and client interactivity.
 */

import { initTheme } from './state/themeState.js';
import { renderNavbar, initNavbarEvents } from './components/Navbar.js';
import { renderHero } from './components/Hero.js';
import { renderMetrics } from './components/Metrics.js';
import { renderShowcase, initShowcaseEvents } from './components/Showcase.js';
import { renderFeatures } from './components/Features.js';
import { renderPricing, initPricingEvents } from './components/Pricing.js';
import { renderTestimonials } from './components/Testimonials.js';
import { renderFaq, initFaqEvents } from './components/Faq.js';
import { renderCtaBanner } from './components/CtaBanner.js';
import { renderFooter, initFooterEvents } from './components/Footer.js';

function initLandingPage() {
  const mountPoint = document.getElementById('landing-app');
  if (!mountPoint) {
    console.error('Mount point #landing-app not found');
    return;
  }

  // 1. Initialize Theme Engine (Light / Dark / Auto system preferences)
  initTheme();

  // 2. Render all modular sections into the DOM
  mountPoint.innerHTML = `
    ${renderNavbar()}
    <main>
      ${renderHero()}
      ${renderMetrics()}
      ${renderShowcase()}
      ${renderFeatures()}
      ${renderPricing()}
      ${renderTestimonials()}
      ${renderFaq()}
      ${renderCtaBanner()}
    </main>
    ${renderFooter()}
  `;

  // 3. Initialize Interactive Event Listeners for each component
  initNavbarEvents();
  initShowcaseEvents();
  initPricingEvents();
  initFaqEvents();
  initFooterEvents();

  // 4. Smooth Anchor Link Navigation
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Bootstrap on DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLandingPage);
} else {
  initLandingPage();
}
