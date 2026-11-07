/**
 * code-blocks.js — Modern ChatGPT & Gemini-Style Code Block Experience
 * Namespace: chat-code-* (Clean, decoupled, collision-free)
 * 
 * Capabilities:
 * - Wraps `<pre><code>` in a modern dark container with a sticky header.
 * - Extracts programming language name or auto-detects via highlight.js.
 * - Provides an independent Copy button with clipboard API + legacy fallback.
 * - Enforces fixed-height scrollable window with custom slim scrollbars.
 * - Debounces rapid clicks and clears previous reset timers.
 * - Idempotent: completely safe to call multiple times without duplicating DOM elements.
 * - Supports dynamically rendered or streamed chat bubbles.
 */

(function () {
  'use strict';

  // SVG Icons
  const COPY_ICON_SVG = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `.trim();

  const CHECK_ICON_SVG = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `.trim();

  /**
   * Helper: extract language from code element classes
   */
  function extractLanguage(codeEl) {
    if (!codeEl) return '';
    const classList = (codeEl.className || '').split(/\s+/);
    for (const cls of classList) {
      if (cls.startsWith('language-')) {
        return cls.replace('language-', '').trim();
      }
    }
    for (const cls of classList) {
      if (cls && cls !== 'hljs') {
        return cls.trim();
      }
    }
    return '';
  }

  /**
   * Fallback clipboard copy using a temporary off-screen textarea
   */
  function fallbackCopyText(text, onSuccess, onError) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, 99999);

    try {
      const successful = document.execCommand('copy');
      if (successful && typeof onSuccess === 'function') {
        onSuccess();
      } else if (!successful && typeof onError === 'function') {
        onError();
      }
    } catch (err) {
      if (typeof onError === 'function') onError(err);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  /**
   * Copy code to clipboard with visual feedback and debounce protection
   */
  function handleCopy(codeEl, copyBtn) {
    // Read raw unformatted text content (no HTML tags, preserving linebreaks/tabs)
    const textToCopy = codeEl.textContent || codeEl.innerText || '';

    // Clear any pending timeout from previous rapid clicks
    if (copyBtn._copyTimeout) {
      clearTimeout(copyBtn._copyTimeout);
      copyBtn._copyTimeout = null;
    }

    const showSuccess = () => {
      copyBtn.classList.add('copied');
      copyBtn.classList.remove('failed');
      copyBtn.innerHTML = `${CHECK_ICON_SVG}<span>Copied!</span>`;

      copyBtn._copyTimeout = setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = `${COPY_ICON_SVG}<span>Copy</span>`;
        copyBtn._copyTimeout = null;
      }, 2000);
    };

    const showError = () => {
      copyBtn.classList.add('failed');
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = `<span>Failed</span>`;

      copyBtn._copyTimeout = setTimeout(() => {
        copyBtn.classList.remove('failed');
        copyBtn.innerHTML = `${COPY_ICON_SVG}<span>Copy</span>`;
        copyBtn._copyTimeout = null;
      }, 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(showSuccess).catch(() => {
        fallbackCopyText(textToCopy, showSuccess, showError);
      });
    } else {
      fallbackCopyText(textToCopy, showSuccess, showError);
    }
  }

  /**
   * Main initializer: transforms all pre > code blocks within a container
   * @param {HTMLElement|Document} root - Context element to search within
   */
  function initializeCodeBlocks(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return;

    const preElements = root.querySelectorAll('pre');

    preElements.forEach((pre) => {
      // 1. Guard against duplicate wrapping (idempotency)
      if (pre.closest('.chat-code-block') || pre.dataset.codeEnhanced === 'true') {
        return;
      }

      const code = pre.querySelector('code');
      if (!code) return;

      // Mark element as enhanced immediately
      pre.dataset.codeEnhanced = 'true';

      // 2. Determine language & perform syntax highlighting
      let detectedLang = extractLanguage(code);

      if (window.hljs) {
        if (detectedLang && window.hljs.getLanguage(detectedLang)) {
          // Highlight with known language
          window.hljs.highlightElement(code);
        } else {
          // Auto-detect language if unspecified
          try {
            const auto = window.hljs.highlightAuto(code.textContent || '');
            if (auto && auto.value) {
              code.innerHTML = auto.value;
              code.classList.add('hljs');
              if (auto.language && !detectedLang) {
                detectedLang = auto.language;
                code.classList.add(`language-${detectedLang}`);
              }
            }
          } catch (e) {
            // Fallback: highlightElement without throwing
            window.hljs.highlightElement(code);
          }
        }
      }

      // 3. Language badge label (uppercase, default to CODE)
      const displayLang = (detectedLang || 'CODE').toUpperCase();

      // 4. Build ChatGPT/Gemini-style Container
      const container = document.createElement('div');
      container.className = 'chat-code-block';

      // Header Bar
      const header = document.createElement('div');
      header.className = 'chat-code-header';

      // Language Badge (Left)
      const langBadge = document.createElement('span');
      langBadge.className = 'chat-code-language';
      langBadge.textContent = displayLang;

      // Copy Button (Right)
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'chat-code-copy-btn';
      copyBtn.setAttribute('aria-label', `Copy ${displayLang} code`);
      copyBtn.innerHTML = `${COPY_ICON_SVG}<span>Copy</span>`;

      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCopy(code, copyBtn);
      });

      header.appendChild(langBadge);
      header.appendChild(copyBtn);

      // Scrollable Code Content Wrapper (Fixed Max Height)
      const content = document.createElement('div');
      content.className = 'chat-code-content';

      // 5. Relocate DOM nodes: insert container before pre, then move pre inside content
      pre.parentNode.insertBefore(container, pre);
      content.appendChild(pre);
      container.appendChild(header);
      container.appendChild(content);
    });
  }

  /**
   * Optional MutationObserver to automatically enhance code blocks in streaming/appended messages
   * @param {HTMLElement} chatContainerEl - Chat container element to watch
   * @returns {MutationObserver|null}
   */
  function observeCodeBlocks(chatContainerEl) {
    if (!chatContainerEl || !window.MutationObserver) return null;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches && node.matches('pre')) {
              initializeCodeBlocks(node.parentNode || document);
            } else if (node.querySelectorAll) {
              const hasPre = node.querySelector('pre');
              if (hasPre) {
                initializeCodeBlocks(node);
              }
            }
          }
        });
      });
    });

    observer.observe(chatContainerEl, { childList: true, subtree: true });
    return observer;
  }

  // Export functions to window
  window.initializeCodeBlocks = initializeCodeBlocks;
  window.observeCodeBlocks = observeCodeBlocks;

  // Auto-run on DOM ready for any server-rendered code blocks
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeCodeBlocks());
  } else {
    initializeCodeBlocks();
  }
})();
