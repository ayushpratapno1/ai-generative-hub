// At the top of the file, add configuration constants
const CONFIG = {
    SCROLL_THRESHOLD: 100,
    DEFAULT_TEXTAREA_HEIGHT: '50px',
    TYPING_ANIMATION_DURATION: '1.5s'
};

document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.querySelector("#chat-container");
  const typedPrompt = document.querySelector("#typedPrompt");
  const submit = document.querySelector("#submit");
  const csrfmiddlewaretoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
  const toggleSwitch = document.getElementById("toggle-theme");
  const emoji = document.getElementById("emoji");
  const scrollToBottomBtn = document.getElementById('scrollToBottom');

  // Theme setup
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    toggleSwitch.checked = true;
  } else {
    document.body.classList.remove("dark-mode");
    toggleSwitch.checked = false;
  }

  toggleSwitch.addEventListener("change", () => {
    if (toggleSwitch.checked) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      emoji.textContent = "🌞";
      localStorage.setItem("theme", "light");
    }
  });

  const escapeHTML = (str) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const renderCode = (text) => {
    const codeBlockPattern = /```[\s\S]*?```/g;
    return text.replace(codeBlockPattern, (match) => {
      return `<pre><code>${match.slice(3, -3)}</code></pre>`;
    });
  };

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
      <strong>${isBot ? "Julie" : "Ayush"}:</strong> ${isBot ? renderCode(text) : escapeHTML(text)}
      <span class="timestamp">${timestamp}</span>
    `;

    bubble.innerHTML = isTyping ? typingHTML : messageHTML;
    chatContainer.appendChild(bubble);
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
    submit.style.opacity = disabled ? '0.6' : '1';
    submit.style.cursor = disabled ? 'not-allowed' : 'pointer';
    // Add loading text
    submit.textContent = disabled ? 'Processing...' : 'Submit';
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
    submit.disabled = isEmpty;
    submit.style.opacity = isEmpty ? '0.6' : '1';
    submit.style.cursor = isEmpty ? 'not-allowed' : 'pointer';
    return isEmpty;
  };

  // Modify the input event listener to check emptiness
  typedPrompt.addEventListener('input', () => {
    typedPrompt.style.height = 'auto';
    typedPrompt.style.height = typedPrompt.scrollHeight + 'px';
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
    
    // Clear textarea immediately
    typedPrompt.value = '';
    typedPrompt.style.height = CONFIG.DEFAULT_TEXTAREA_HEIGHT;
    checkTextareaEmpty(); // Check after clearing
    typedPrompt.focus();

    // Add user message to chat
    addChatBubble(messageToSend, false);

    // Get and add bot response
    const response = await fetchData(messageToSend);
    addChatBubble(response.message || "Error: No message received", true);
  }

  // Submit button click
  submit.addEventListener("click", handleSubmit);

  // Add this function to detect mobile devices
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
});
