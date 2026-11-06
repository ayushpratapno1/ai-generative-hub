/* ==========================================================================
   THEME.JS — Premium Theme Controller
   Manages theme toggling, localStorage persistence, OS preference fallback,
   View Transitions API circular reveal animation, logo animation, and ARIA state.
   Zero external dependencies (No jQuery, Bootstrap, or Tailwind).
   ========================================================================== */

(function () {
  'use strict';

  // Prevent multiple initializations if script is loaded more than once
  if (window.__themeToggleInit) return;
  window.__themeToggleInit = true;

  // ---------------------------------------------------------------------------
  // 1. CONSTANTS & DOM REFERENCES
  // ---------------------------------------------------------------------------
  var THEME_KEY = 'theme';
  var DARK      = 'dark';
  var LIGHT     = 'light';
  var HTML      = document.documentElement;

  // Transition lock to prevent concurrent transitions during rapid clicks
  var isTransitioning = false;

  // ---------------------------------------------------------------------------
  // 2. THEME DETECTION & STATE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Determine initial theme using priority:
   * 1. Explicit user choice in localStorage
   * 2. Operating system prefers-color-scheme
   * 3. Default to light
   */
  function getPreferredTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === DARK || saved === LIGHT) {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return DARK;
    }
    return LIGHT;
  }

  function currentTheme() {
    return HTML.getAttribute('data-theme') || getPreferredTheme();
  }

  function isDark() {
    return currentTheme() === DARK;
  }

  // ---------------------------------------------------------------------------
  // 3. APPLY THEME (Instant state update)
  // ---------------------------------------------------------------------------

  function applyTheme(theme) {
    HTML.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.classList.toggle('dark-mode', theme === DARK);
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // localStorage may be disabled (e.g. private mode restrictions)
    }
    updateToggleAria();
  }

  // ---------------------------------------------------------------------------
  // 4. ACCESSIBILITY (ARIA State Management)
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
  // 5. ANIMATED LOGO
  // ---------------------------------------------------------------------------

  function animateLogo() {
    var logo = document.querySelector('.site-logo');
    if (!logo) return;
    logo.classList.remove('site-logo--animating');
    void logo.offsetWidth; // Force reflow to reliably restart animation
    logo.classList.add('site-logo--animating');
    logo.addEventListener(
      'animationend',
      function () {
        logo.classList.remove('site-logo--animating');
      },
      { once: true }
    );
  }

  // ---------------------------------------------------------------------------
  // 6. MAXIMUM RADIUS CALCULATION
  //    Computes the diagonal distance from (x, y) to the farthest viewport corner.
  // ---------------------------------------------------------------------------

  function calculateMaxRadius(x, y) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    return Math.ceil(
      Math.hypot(
        Math.max(x, w - x),
        Math.max(y, h - y)
      )
    );
  }

  // ---------------------------------------------------------------------------
  // 7. CIRCULAR REVEAL VIA VIEW TRANSITIONS API
  // ---------------------------------------------------------------------------

  function toggleThemeWithReveal(x, y) {
    if (isTransitioning) return;

    var newTheme = isDark() ? LIGHT : DARK;

    // Check for user-level reduced motion preference
    var prefersReduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fallback path: View Transitions API unsupported or reduced motion enabled
    if (!document.startViewTransition || prefersReduced) {
      applyTheme(newTheme);
      if (!prefersReduced) {
        animateLogo();
      }
      return;
    }

    // View Transitions path
    isTransitioning = true;
    var radius = calculateMaxRadius(x, y);

    try {
      var transition = document.startViewTransition(function () {
        applyTheme(newTheme);
      });

      // Animate circular clip-path on the new root snapshot once DOM is swapped
      transition.ready
        .then(function () {
          var animation = document.documentElement.animate(
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

          // Reset lock when reveal animation finishes
          animation.finished
            .catch(function () {})
            .finally(function () {
              isTransitioning = false;
            });
        })
        .catch(function () {
          // If transition is aborted, ensure state is updated and lock is released
          applyTheme(newTheme);
          isTransitioning = false;
        });

      transition.finished
        .catch(function () {})
        .finally(function () {
          isTransitioning = false;
        });
    } catch (err) {
      // Graceful fallback on unexpected API failure
      applyTheme(newTheme);
      isTransitioning = false;
    }
  }

  // ---------------------------------------------------------------------------
  // 8. EVENT BINDING & LIFECYCLE
  // ---------------------------------------------------------------------------

  function init() {
    var toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    // Ensure theme is active and synced with DOM
    var initialTheme = HTML.getAttribute('data-theme') || getPreferredTheme();
    HTML.setAttribute('data-theme', initialTheme);
    if (document.body) {
      document.body.classList.toggle('dark-mode', initialTheme === DARK);
    }
    updateToggleAria();

    // Single unified click listener (native button handles Space/Enter automatically)
    toggleBtn.addEventListener('click', function () {
      var rect = toggleBtn.getBoundingClientRect();
      var x = rect.left + rect.width / 2;
      var y = rect.top + rect.height / 2;
      toggleThemeWithReveal(x, y);
    });

    // Listen for OS color scheme change ONLY when user has not explicitly saved a choice
    if (window.matchMedia) {
      var colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      colorSchemeQuery.addEventListener('change', function (e) {
        var hasExplicitChoice = Boolean(localStorage.getItem(THEME_KEY));
        if (!hasExplicitChoice) {
          applyTheme(e.matches ? DARK : LIGHT);
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 9. IMMEDIATE EXECUTION (Prevent Flash) & DOM READY
  // ---------------------------------------------------------------------------

  // Set attribute on <html> immediately if not already set
  if (!HTML.getAttribute('data-theme')) {
    HTML.setAttribute('data-theme', getPreferredTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
