/* ==========================================================================
   THEME.JS — Round icon button, circular reveal, logo animation
   Production-ready vanilla JS. No jQuery / Bootstrap / Tailwind.
   ========================================================================== */

(function () {
  'use strict';

  // Guard against double-init (e.g. script loaded twice)
  if (window.__themeToggleInit) return;
  window.__themeToggleInit = true;

  // ---------------------------------------------------------------------------
  // 1. CONSTANTS
  // ---------------------------------------------------------------------------
  var THEME_KEY = 'theme';
  var DARK      = 'dark';
  var LIGHT     = 'light';
  var HTML      = document.documentElement;

  // ---------------------------------------------------------------------------
  // 2. HELPERS
  // ---------------------------------------------------------------------------
  function currentTheme() {
    return HTML.getAttribute('data-theme') || LIGHT;
  }

  function isDark() {
    return currentTheme() === DARK;
  }

  // ---------------------------------------------------------------------------
  // 3. APPLY THEME (instant, no animation — used on load & fallback)
  // ---------------------------------------------------------------------------
  function applyTheme(theme) {
    HTML.setAttribute('data-theme', theme);
    // Keep legacy .dark-mode class in sync for old CSS in style.css
    document.body.classList.toggle('dark-mode', theme === DARK);
    localStorage.setItem(THEME_KEY, theme);
    updateToggleAria();
  }

  // ---------------------------------------------------------------------------
  // 4. ARIA — keep the toggle accessible
  // ---------------------------------------------------------------------------
  function updateToggleAria() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var dark = isDark();
    btn.setAttribute('aria-checked', String(dark));
    btn.setAttribute(
      'aria-label',
      dark ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  // ---------------------------------------------------------------------------
  // 5. LOGO ANIMATION — subtle pulse during switch
  // ---------------------------------------------------------------------------
  function animateLogo() {
    var logo = document.querySelector('.site-logo');
    if (!logo) return;
    logo.classList.remove('site-logo--animating');
    void logo.offsetWidth;                         // force reflow
    logo.classList.add('site-logo--animating');
    logo.addEventListener(
      'animationend',
      function () { logo.classList.remove('site-logo--animating'); },
      { once: true }
    );
  }

  // ---------------------------------------------------------------------------
  // 6. MAX RADIUS — distance from (x,y) to the farthest viewport corner
  // ---------------------------------------------------------------------------
  function maxRadius(x, y) {
    return Math.ceil(
      Math.hypot(
        Math.max(x, window.innerWidth  - x),
        Math.max(y, window.innerHeight - y)
      )
    );
  }

  // ---------------------------------------------------------------------------
  // 7. TOGGLE WITH CIRCULAR REVEAL
  //    Uses the Web Animations API on ::view-transition-new(root).
  //    Falls back to instant switch when unsupported or reduced-motion.
  // ---------------------------------------------------------------------------
  function toggleThemeWithReveal(x, y) {
    var newTheme = isDark() ? LIGHT : DARK;

    var prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Fallback: no View Transitions API or reduced motion
    if (!document.startViewTransition || prefersReduced) {
      applyTheme(newTheme);
      if (!prefersReduced) animateLogo();
      return;
    }

    var radius = maxRadius(x, y);

    // Start the View Transition
    var transition = document.startViewTransition(function () {
      applyTheme(newTheme);
    });

    // Once both snapshots are captured, animate the circular clip-path
    transition.ready.then(function () {
      document.documentElement.animate(
        [
          { clipPath: 'circle(0px at ' + x + 'px ' + y + 'px)' },
          { clipPath: 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)' }
        ],
        {
          duration: 550,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );
      animateLogo();
    });
  }

  // ---------------------------------------------------------------------------
  // 8. INIT — runs when DOM is ready
  // ---------------------------------------------------------------------------
  function init() {
    var toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    // Sync body class (the <head> inline script already set data-theme)
    document.body.classList.toggle('dark-mode', isDark());
    updateToggleAria();

    // Click — always use button center as reveal origin
    toggleBtn.addEventListener('click', function () {
      var rect = toggleBtn.getBoundingClientRect();
      var x = rect.left + rect.width  / 2;
      var y = rect.top  + rect.height / 2;
      toggleThemeWithReveal(x, y);
    });

    // OS preference change — only follow when user hasn't explicitly chosen
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', function (e) {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? DARK : LIGHT);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 9. BOOTSTRAP
  // ---------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
