// At the top of the file, add configuration constants
const CONFIG = {
    SCROLL_THRESHOLD: 100,
    DEFAULT_TEXTAREA_HEIGHT: '50px',
    TYPING_ANIMATION_DURATION: '1.5s'
};

// Add this at the top with other constants
const PLACEHOLDER_MESSAGES = {
    greetings: [
        "👋 Hi! How can I help you today?",
        "🌟 Welcome! What's on your mind?",
        "✨ Hello! I'm here to assist you!",
        "💫 Hey there! Let's chat!",
        "🎯 Hi! What would you like to know?"
    ],
    questions: [
        "🤔 Ask me anything!",
        "💭 What's your question?",
        "❓ Curious about something?",
        "🔍 Looking for information?",
        "💡 Need some insights?"
    ],
    suggestions: [
        "📝 Try asking about...",
        "🎨 Tell me more about...",
        "🎨 Let's explore...",
        "🚀 Want to learn about...",
        "🎯 Interested in..."
    ],
    fun: [
        "🎮 Ready for a chat!",
        "🎲 Let's have a conversation!",
        "🎪 Ask me something fun!",
        "🎭 I'm all ears!",
        "🎪 What's your story?"
    ]
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
      <strong>${isBot ? "Julie" : getUserName()}:</strong> ${isBot ? renderCode(text) : escapeHTML(text)}
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

  const textarea = document.getElementById("typedPrompt");
  let typingInterval = null;
  let isTypingActive = false;
  const TYPING_SPEED = 50;  // Consistent typing speed in milliseconds
  const DELETING_SPEED = 30;  // Consistent deleting speed in milliseconds
  const PAUSE_BEFORE_DELETE = 2000;  // Pause before starting to delete
  const PAUSE_BEFORE_NEXT = 1000;  // Pause before starting next message

  // Function to get a random message
  function getRandomMessage() {
      const categories = Object.keys(PLACEHOLDER_MESSAGES);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const messages = PLACEHOLDER_MESSAGES[randomCategory];
      return messages[Math.floor(Math.random() * messages.length)];
  }

  // Function to start the typing effect
  function startTypingEffect() {
      if (typingInterval || isTypingActive) return;
      
      let currentMessage = getRandomMessage();
      let currentIndex = 0;
      let isDeleting = false;
      
      isTypingActive = true;
      
      function type() {
          if (!isTypingActive) return;
          
          if (isDeleting) {
              textarea.placeholder = currentMessage.substring(0, currentIndex - 1);
              currentIndex--;
              
              if (currentIndex === 0) {
                  isDeleting = false;
                  currentMessage = getRandomMessage();
                  clearInterval(typingInterval);
                  typingInterval = null;
                  
                  setTimeout(() => {
                      if (isTypingActive) {
                          typingInterval = setInterval(type, TYPING_SPEED);
                      }
                  }, PAUSE_BEFORE_NEXT);
              }
          } else {
              textarea.placeholder = currentMessage.substring(0, currentIndex + 1);
              currentIndex++;
              
              if (currentIndex === currentMessage.length) {
                  isDeleting = true;
                  clearInterval(typingInterval);
                  typingInterval = null;
                  
                  setTimeout(() => {
                      if (isTypingActive) {
                          typingInterval = setInterval(type, DELETING_SPEED);
                      }
                  }, PAUSE_BEFORE_DELETE);
              }
          }
      }
      
      // Clear any existing interval before starting
      if (typingInterval) {
          clearInterval(typingInterval);
          typingInterval = null;
      }
      
      typingInterval = setInterval(type, TYPING_SPEED);
  }

  // Function to stop the typing effect
  function stopTypingEffect() {
      isTypingActive = false;
      if (typingInterval) {
          clearInterval(typingInterval);
          typingInterval = null;
      }
      textarea.placeholder = "";
  }

  // Function to reset the typing effect
  function resetTypingEffect() {
      stopTypingEffect();
      if (!textarea.value) {
          setTimeout(startTypingEffect, 500);
      }
  }

  // Start the effect when page loads
  startTypingEffect();

  // Event listeners for user interaction
  const stopEvents = ['focus', 'click', 'keydown', 'input', 'touchstart'];
  stopEvents.forEach(event => {
      textarea.addEventListener(event, () => {
          stopTypingEffect();
      });
  });

  // Handle blur event
  textarea.addEventListener('blur', () => {
      if (!textarea.value) {
          resetTypingEffect();
      }
  });

  // Handle input changes
  textarea.addEventListener('input', () => {
      if (!textarea.value) {
          resetTypingEffect();
      }
  });

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
          stopTypingEffect();
      } else if (!textarea.value) {
          resetTypingEffect();
      }
  });
});
