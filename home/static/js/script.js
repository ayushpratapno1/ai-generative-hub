// At the top of the file, add configuration constants
const CONFIG = {
    SCROLL_THRESHOLD: 100,
    TYPING_ANIMATION_DURATION: '1.5s'
};

// Add this at the top of your script.js file, after the CONFIG object
const COOL_NAMES = {
    adjectives: [
        'Cosmic', 'Quantum', 'Nebula', 'Stellar', 'Galactic', 'Astral', 'Celestial', 
        'Mystic', 'Ethereal', 'Cosmic', 'Digital', 'Cyber', 'Neon', 'Crystal', 'Shadow',
        'Phantom', 'Echo', 'Frost', 'Blaze', 'Storm', 'Thunder', 'Vortex', 'Zen'
    ],
    nouns: [
        'Voyager', 'Explorer', 'Pioneer', 'Nomad', 'Wanderer', 'Sage', 'Mage',
        'Knight', 'Phoenix', 'Dragon', 'Wolf', 'Hawk', 'Eagle', 'Tiger', 'Lion',
        'Ninja', 'Samurai', 'Warrior', 'Guardian', 'Sentinel', 'Warden', 'Ranger'
    ]
};

// Function to generate a random cool name
function generateCoolName() {
    const randomAdjective = COOL_NAMES.adjectives[Math.floor(Math.random() * COOL_NAMES.adjectives.length)];
    const randomNoun = COOL_NAMES.nouns[Math.floor(Math.random() * COOL_NAMES.nouns.length)];
    return `${randomAdjective}${randomNoun}`;
}

// Function to get or create user name
function getUserName() {
    let userName = localStorage.getItem('userName');
    if (!userName) {
        userName = generateCoolName();
        localStorage.setItem('userName', userName);
    }
    return userName;
}

document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.querySelector("#chat-container");
  const typedPrompt = document.querySelector("#typedPrompt");
  const submit = document.querySelector("#submit");
  const csrfmiddlewaretoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
  const scrollToBottomBtn = document.getElementById('scrollToBottom');

  // Theme is now managed by theme.js — no toggle logic here

  const escapeHTML = (str) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  /* --------------------------------------------------------------------------
     CODE BLOCK ENHANCER (Language Badge, Highlight.js, Copy to Clipboard)
     -------------------------------------------------------------------------- */
  const COPY_ICON_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const CHECK_ICON_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const getCodeLanguage = (codeEl) => {
    const classList = (codeEl.className || "").split(/\s+/);
    for (const cls of classList) {
      if (cls.startsWith("language-")) {
        return cls.replace("language-", "").trim();
      }
    }
    for (const cls of classList) {
      if (cls && cls !== "hljs") {
        return cls.trim();
      }
    }
    return "Code";
  };

  const copyToClipboard = (text, btn) => {
    const setSuccess = () => {
      btn.classList.add("copied");
      btn.innerHTML = `${CHECK_ICON_SVG}<span>Copied!</span>`;
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.innerHTML = `${COPY_ICON_SVG}<span>Copy code</span>`;
      }, 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(setSuccess).catch(() => {
        fallbackCopy(text, setSuccess);
      });
    } else {
      fallbackCopy(text, setSuccess);
    }
  };

  const fallbackCopy = (text, onSuccess) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      onSuccess();
    } catch (e) {
      console.error("Clipboard fallback copy failed: ", e);
    } finally {
      ta.remove();
    }
  };

  const enhanceCodeBlocks = (root = document) => {
    const preList = root.querySelectorAll("pre");
    preList.forEach((pre) => {
      // Prevent duplicate wrappers if called repeatedly
      if (pre.closest(".code-block-container") || pre.dataset.enhanced === "true") {
        return;
      }

      const code = pre.querySelector("code");
      if (!code) return;

      pre.dataset.enhanced = "true";

      // 1. Syntax highlighting via highlight.js if loaded
      if (window.hljs && typeof window.hljs.highlightElement === "function") {
        window.hljs.highlightElement(code);
      }

      // 2. Extract language
      const lang = getCodeLanguage(code);

      // 3. Construct modern ChatGPT-style code container
      const container = document.createElement("div");
      container.className = "code-block-container";

      const header = document.createElement("div");
      header.className = "code-header";

      const langSpan = document.createElement("span");
      langSpan.className = "code-lang";
      langSpan.textContent = lang.toUpperCase();

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-btn";
      copyBtn.setAttribute("aria-label", `Copy ${lang} code`);
      copyBtn.innerHTML = `${COPY_ICON_SVG}<span>Copy code</span>`;

      copyBtn.addEventListener("click", () => {
        const rawCode = code.innerText || code.textContent || "";
        copyToClipboard(rawCode, copyBtn);
      });

      header.appendChild(langSpan);
      header.appendChild(copyBtn);

      const content = document.createElement("div");
      content.className = "code-content";

      // Move pre inside container
      pre.parentNode.insertBefore(container, pre);
      content.appendChild(pre);
      container.appendChild(header);
      container.appendChild(content);
    });
  };

  // Expose globally for dynamic AJAX / fetch message rendering
  window.enhanceCodeBlocks = enhanceCodeBlocks;

  let messageCount = 0;

  const formatTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
  };

  const addChatBubble = (text, isBot = false, isTyping = false) => {
    messageCount++;
    const bubble = document.createElement("div");
    bubble.classList.add("chat-bubble", isBot ? "bot-message" : "user-message");
    bubble.id = `message-${messageCount}`;

    const timestamp = formatTimestamp();
    const typingHTML = `<em>Julie is typing<span class="dots"></span></em>`;
    const messageHTML = `
      <strong>${isBot ? "Julie" : getUserName()}:</strong> ${isBot ? text : escapeHTML(text)}
      <span class="timestamp">${timestamp}</span>
    `;

    bubble.innerHTML = isTyping ? typingHTML : messageHTML;
    chatContainer.appendChild(bubble);

    // Enhance code blocks inside bot response
    if (isBot && !isTyping) {
      enhanceCodeBlocks(bubble);
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (isTyping) {
      const dotsElement = bubble.querySelector(".dots");
      if (dotsElement) {
        dotsElement.style.animation = "none";
        void dotsElement.offsetWidth;
        dotsElement.style.animation = "";
      }
    }

    return bubble;
  };

  const showTypingIndicator = () => {
    return addChatBubble("", true, true);
  };

  // Add a flag to track API processing state
  let isProcessing = false;

  // Modify the toggleSubmitButton function
  const toggleSubmitButton = (disabled) => {
    isProcessing = disabled;
    submit.disabled = disabled;
    if (disabled) {
      submit.classList.add('is-loading');
      submit.setAttribute('aria-label', 'Processing message...');
    } else {
      submit.classList.remove('is-loading');
      submit.setAttribute('aria-label', 'Send message');
    }
  };

  const fetchData = async (message) => {
    const data = new FormData();
    data.append('prompt', message);
    data.append('csrfmiddlewaretoken', csrfmiddlewaretoken);
    const typingBubble = showTypingIndicator();
    
    // Disable submit button
    toggleSubmitButton(true);

    try {
      const response = await fetch("/api", {
        method: 'POST',
        body: data,
        headers: {
          'X-CSRFToken': csrfmiddlewaretoken
        },
        credentials: 'same-origin',
      });

      typingBubble.remove();

      if (!response.ok) {
        console.error("Server error:", response.statusText);
        return { message: "Error: Unable to get response" };
      }

      const jsonResponse = await response.json();
      return { message: jsonResponse.message };
    } catch (error) {
      console.error("Fetch error:", error);
      return { message: "Error: Unable to fetch response" };
    } finally {
      // Re-enable submit button and check emptiness
      toggleSubmitButton(false);
      checkTextareaEmpty();
    }
  };

  // Add this function to check if textarea is empty
  const checkTextareaEmpty = () => {
    const isEmpty = !typedPrompt.value.trim();
    if (!isProcessing) {
      submit.disabled = isEmpty;
    }
    return isEmpty;
  };

  // Modify the input event listener to check emptiness and auto-expand
  typedPrompt.addEventListener('input', () => {
    if (!typedPrompt.value) {
      typedPrompt.style.height = '';
    } else {
      typedPrompt.style.height = 'auto';
      typedPrompt.style.height = typedPrompt.scrollHeight + 'px';
    }
    checkTextareaEmpty(); // Check on every input
  });

  const RATE_LIMIT = 3000; // 3 seconds
  let lastSubmissionTime = 0;

  const MAX_MESSAGE_LENGTH = 1000;

  // Handle message send
  async function handleSubmit() {
    const now = Date.now();
    if (now - lastSubmissionTime < RATE_LIMIT) {
        addChatBubble("Please wait a moment before sending another message.", true);
        return;
    }
    lastSubmissionTime = now;

    const userInput = typedPrompt.value.trim();
    if (!userInput) {
        return;
    }

    if (userInput.length > MAX_MESSAGE_LENGTH) {
        addChatBubble(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`, true);
        return;
    }

    // Store the input before clearing
    const messageToSend = userInput;
    
    // Clear textarea immediately and reset inline height so CSS controls dimensions
    typedPrompt.value = '';
    typedPrompt.style.height = '';
    checkTextareaEmpty(); // Check after clearing
    
    // Avoid jarring viewport jumps/virtual keyboard popups on mobile devices
    if (!isMobileDevice()) {
      typedPrompt.focus({ preventScroll: true });
    }

    // Add user message to chat
    addChatBubble(messageToSend, false);

    // Get and add bot response
    const response = await fetchData(messageToSend);
    addChatBubble(response.message || "Error: No message received", true);
  }

  // Submit button click
  submit.addEventListener("click", handleSubmit);

  // Add this function to detect mobile devices or compact mobile viewports
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 576;
  };

  // Modify the Enter key event listener
  typedPrompt.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const isEmpty = !typedPrompt.value.trim();
        
        if (isEmpty) {
            // Prevent default behavior (new line) when textarea is empty
            event.preventDefault();
            return;
        }

        if (isMobileDevice()) {
            // On mobile, Enter creates a new line only if there's text
            return true;
        } else {
            // On desktop, Enter submits the form if there's text
            if (!event.shiftKey && !isProcessing) {
                event.preventDefault();
                handleSubmit();
            }
        }
    }
  });

  // Sidebar toggle
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    sidebar.classList.toggle('active');
    mainContent.style.marginLeft = '0';
  });

  // Add scroll event listener to show/hide the button
  chatContainer.addEventListener('scroll', () => {
    // Show button when user scrolls up (not at bottom)
    if (chatContainer.scrollHeight - chatContainer.scrollTop > chatContainer.clientHeight + 100) {
      scrollToBottomBtn.style.display = 'flex';
    } else {
      scrollToBottomBtn.style.display = 'none';
    }
  });

  // Add click event listener to scroll to bottom
  scrollToBottomBtn.addEventListener('click', () => {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: 'smooth'
    });
  });

  // Add focus event listener to textarea
  typedPrompt.addEventListener('focus', () => {
    checkTextareaEmpty();
  });

  // Call checkTextareaEmpty on page load
  checkTextareaEmpty(); // Initial check

  // Enhance any initial code blocks in the chat container
  enhanceCodeBlocks(chatContainer);
});
