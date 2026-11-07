/**
 * code-blocks.js — ChatGPT/Gemini-style code block experience
 * Namespace: .chat-code-*
 *
 * Features:
 * - Language label and copy button
 * - Highlight.js syntax highlighting with language fallback
 * - Independent scrolling handled by code-blocks.css
 * - Idempotent enhancement
 * - Supports AJAX and dynamically inserted content
 * - Reuses MutationObservers
 * - Clipboard API with fallback
 */

(function () {
  'use strict';

  const COPY_ICON_SVG = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true" focusable="false">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  `.trim();

  const CHECK_ICON_SVG = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
         stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true" focusable="false">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `.trim();

  const observers = new WeakMap();
  const COPY_FEEDBACK_MS = 1800;

  function getHighlightJs() {
    return window.hljs &&
      typeof window.hljs.getLanguage === 'function'
      ? window.hljs
      : null;
  }

  /**
   * Extract language from code element classes.
   */
  function extractLanguage(codeEl) {
    if (!codeEl) return '';

    const classes = Array.from(codeEl.classList || []);

    for (const className of classes) {
      const match = className.match(/^(?:language|lang)-(.+)$/i);
      if (match) return match[1].trim().toLowerCase();
    }

    const hljs = getHighlightJs();

    if (hljs) {
      for (const className of classes) {
        if (
          className &&
          className !== 'hljs' &&
          hljs.getLanguage(className)
        ) {
          return className.toLowerCase();
        }
      }
    }

    return '';
  }

  function setButtonContent(button, iconMarkup, label) {
    button.innerHTML = `${iconMarkup}<span>${label}</span>`;
  }

  function clearFeedbackTimer(button) {
    if (button._chatCodeFeedbackTimer) {
      window.clearTimeout(button._chatCodeFeedbackTimer);
      button._chatCodeFeedbackTimer = null;
    }
  }

  /**
   * Display copy success or failure feedback.
   */
  function showCopyState(button, state) {
    clearFeedbackTimer(button);

    button.classList.remove('copied', 'failed');

    if (state === 'copied') {
      button.classList.add('copied');
      setButtonContent(button, CHECK_ICON_SVG, 'Copied!');
    } else if (state === 'failed') {
      button.classList.add('failed');
      setButtonContent(button, COPY_ICON_SVG, 'Failed');
    } else {
      setButtonContent(button, COPY_ICON_SVG, 'Copy');
      return;
    }

    button._chatCodeFeedbackTimer = window.setTimeout(function () {
      button.classList.remove('copied', 'failed');
      setButtonContent(button, COPY_ICON_SVG, 'Copy');
      button._chatCodeFeedbackTimer = null;
    }, COPY_FEEDBACK_MS);
  }

  /**
   * Legacy clipboard fallback.
   */
  function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');

    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');

    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';

    document.body.appendChild(textarea);

    let copied = false;

    try {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    } finally {
      textarea.remove();
    }

    return copied;
  }

  async function writeClipboard(text) {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        return fallbackCopyText(text);
      }
    }

    return fallbackCopyText(text);
  }

  /**
   * Copy code with feedback and duplicate-click protection.
   */
  async function handleCopy(codeEl, copyBtn) {
    if (copyBtn.dataset.copyPending === 'true') return;

    const textToCopy = codeEl.textContent || '';

    if (!textToCopy) {
      showCopyState(copyBtn, 'failed');
      return;
    }

    copyBtn.dataset.copyPending = 'true';
    copyBtn.disabled = true;

    try {
      const success = await writeClipboard(textToCopy);
      showCopyState(copyBtn, success ? 'copied' : 'failed');
    } catch (error) {
      showCopyState(copyBtn, 'failed');
    } finally {
      copyBtn.dataset.copyPending = 'false';
      copyBtn.disabled = false;
    }
  }

  /**
   * Highlight code using Highlight.js.
   */
  function highlightCode(codeEl, declaredLanguage) {
    const hljs = getHighlightJs();

    if (!hljs) return declaredLanguage;

    if (codeEl.dataset.chatCodeHighlighted === 'true') {
      return declaredLanguage || extractLanguage(codeEl);
    }

    let language = declaredLanguage;

    if (language && hljs.getLanguage(language)) {
      try {
        if (!codeEl.classList.contains('hljs')) {
          hljs.highlightElement(codeEl);
        }

        codeEl.dataset.chatCodeHighlighted = 'true';
        return language;
      } catch (error) {
        console.warn('Code highlighting failed:', error);
      }
    }

    // Auto-detect missing or unsupported languages.
    try {
      const source = codeEl.textContent || '';
      const result = hljs.highlightAuto(source);

      if (result && result.value) {
        codeEl.innerHTML = result.value;
        codeEl.classList.add('hljs');
        codeEl.dataset.chatCodeHighlighted = 'true';

        if (result.language) {
          language = result.language;
          codeEl.classList.add(`language-${language}`);
        }
      }
    } catch (error) {
      console.warn('Automatic language detection failed:', error);
    }

    return language;
  }

  /**
   * Create the code-block container and header.
   */
  function createCodeBlock(pre, code) {
    const container = document.createElement('div');
    container.className = 'chat-code-block';

    const header = document.createElement('div');
    header.className = 'chat-code-header';

    const languageLabel = document.createElement('span');
    languageLabel.className = 'chat-code-language';

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'chat-code-copy-btn';
    copyButton.setAttribute('aria-label', 'Copy code');
    copyButton.setAttribute('title', 'Copy code');

    setButtonContent(copyButton, COPY_ICON_SVG, 'Copy');

    const content = document.createElement('div');
    content.className = 'chat-code-content';

    copyButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      handleCopy(code, copyButton);
    });

    header.appendChild(languageLabel);
    header.appendChild(copyButton);

    pre.parentNode.insertBefore(container, pre);
    content.appendChild(pre);

    container.appendChild(header);
    container.appendChild(content);

    return {
      container,
      languageLabel,
      copyButton
    };
  }

  /**
   * Initialize code blocks inside a container.
   */
  function initializeCodeBlocks(root) {
    root = root || document;

    if (!root || typeof root.querySelectorAll !== 'function') return;

    const preElements = [];

    if (
      root.nodeType === Node.ELEMENT_NODE &&
      root.matches('pre')
    ) {
      preElements.push(root);
    }

    root.querySelectorAll('pre').forEach(function (pre) {
      preElements.push(pre);
    });

    preElements.forEach(function (pre) {
      if (
        !pre ||
        !pre.parentNode ||
        pre.dataset.codeEnhanced === 'true' ||
        pre.closest('.chat-code-block')
      ) {
        return;
      }

      const code = pre.querySelector('code');
      if (!code) return;

      const declaredLanguage = extractLanguage(code);
      const detectedLanguage = highlightCode(
        code,
        declaredLanguage
      );

      const displayLanguage =
        (detectedLanguage || 'CODE').toUpperCase();

      const elements = createCodeBlock(pre, code);

      elements.languageLabel.textContent = displayLanguage;

      elements.copyButton.setAttribute(
        'aria-label',
        `Copy ${displayLanguage} code`
      );

      elements.copyButton.setAttribute(
        'title',
        `Copy ${displayLanguage} code`
      );

      pre.dataset.codeEnhanced = 'true';
    });
  }

  /**
   * Watch a chat container for dynamically inserted code blocks.
   * Reuses an existing observer for the same container.
   */
  function observeCodeBlocks(chatContainerEl) {
    if (
      !chatContainerEl ||
      typeof chatContainerEl.querySelectorAll !== 'function' ||
      typeof window.MutationObserver !== 'function'
    ) {
      return null;
    }

    const existingObserver = observers.get(chatContainerEl);

    if (existingObserver) {
      return existingObserver;
    }

    initializeCodeBlocks(chatContainerEl);

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          if (node.matches && node.matches('pre')) {
            initializeCodeBlocks(node);
          } else if (node.querySelectorAll) {
            initializeCodeBlocks(node);
          }
        });
      });
    });

    observer.observe(chatContainerEl, {
      childList: true,
      subtree: true
    });

    observers.set(chatContainerEl, observer);

    return observer;
  }

  /**
   * Stop watching a chat container.
   */
  function unobserveCodeBlocks(chatContainerEl) {
    const observer =
      chatContainerEl && observers.get(chatContainerEl);

    if (!observer) return;

    observer.disconnect();
    observers.delete(chatContainerEl);
  }

  // Preserve existing public function names.
  window.initializeCodeBlocks = initializeCodeBlocks;
  window.observeCodeBlocks = observeCodeBlocks;
  window.unobserveCodeBlocks = unobserveCodeBlocks;

  // Initialize server-rendered code blocks.
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        initializeCodeBlocks(document);
      },
      { once: true }
    );
  } else {
    initializeCodeBlocks(document);
  }

})();