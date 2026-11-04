// Add configuration constants at the top
const CONFIG = {
    SCROLL_THRESHOLD: 100,
    DEFAULT_TEXTAREA_HEIGHT: '50px',
    TYPING_ANIMATION_DURATION: '1.5s'
};

document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggle-theme");
  const emoji = document.getElementById("emoji");
  const chatContainer = document.querySelector("#chat-container");
  const typedPrompt = document.querySelector("#prompt");
  const submitButton = document.querySelector("#submit");
  const csrfmiddlewaretoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('.main-content');

  // Add a flag to track API processing state
  let isProcessing = false;

  // Initialize theme based on localStorage
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    toggleSwitch.checked = true;
  } else {
    document.body.classList.remove("dark-mode");
    toggleSwitch.checked = false;
  }

  // Handle theme toggle switch
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

  // Sidebar toggle functionality
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    mainContent.style.marginLeft = sidebar.classList.contains('active') ? '250px' : '0';
  });

  // Helper function to escape HTML characters
  const escapeHTML = (str) => str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Helper function to render code blocks correctly
  const renderCode = (text) => {
    const codeBlockPattern = /```[\s\S]*?```/g; 
    return text.replace(codeBlockPattern, (match) => `<pre><code>${match.slice(3, -3)}</code></pre>`);
  };

  // Add scroll to bottom functionality
  const scrollToBottomBtn = document.getElementById('scrollToBottom');
  
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

  // Helper function to add chat bubbles
  const addChatBubble = (text, isBot = false, isTyping = false) => {
    const bubble = document.createElement("div");
    bubble.classList.add("chat-bubble", isBot ? "bot-message" : "user-message");
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const typingHTML = `<em>Julie is typing<span class="dots"></span></em>`;
    const messageHTML = `
      <strong>${isBot ? "Julie" : "Ayush"}:</strong> ${isBot ? renderCode(text) : escapeHTML(text)}
      <span class="timestamp">${timestamp}</span>
    `;
    bubble.innerHTML = isTyping ? typingHTML : messageHTML;
    chatContainer.appendChild(bubble);
    
    // Smooth scroll to bottom when new message is added
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });

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

  // Display typing indicator for Julie
  const showTypingIndicator = () => addChatBubble("", true, true);

  // Add function to toggle submit button state
  const toggleSubmitButton = (disabled) => {
    isProcessing = disabled;
    submitButton.disabled = disabled;
    submitButton.style.opacity = disabled ? '0.6' : '1';
    submitButton.style.cursor = disabled ? 'not-allowed' : 'pointer';
    submitButton.textContent = disabled ? 'Generating...' : 'Generate';
    
    // Also disable the textarea when processing
    typedPrompt.disabled = disabled;
    typedPrompt.style.opacity = disabled ? '0.6' : '1';
    typedPrompt.style.cursor = disabled ? 'not-allowed' : 'text';
  };

  // Add function to check if textarea is empty
  const checkTextareaEmpty = () => {
    const isEmpty = !typedPrompt.value.trim();
    submitButton.disabled = isEmpty;
    submitButton.style.opacity = isEmpty ? '0.6' : '1';
    submitButton.style.cursor = isEmpty ? 'not-allowed' : 'pointer';
    return isEmpty;
  };

  // Add rate limiting
  const RATE_LIMIT = 3000; // 3 seconds
  let lastSubmissionTime = 0;

  // Handle form submission to fetch data
  const fetchData = async () => {
    const data = new FormData();
    const apiChoice = document.querySelector("#api").value;
    data.append('prompt', typedPrompt.value);
    data.append('api', apiChoice);
    data.append('csrfmiddlewaretoken', csrfmiddlewaretoken);

    const typingBubble = showTypingIndicator();
    toggleSubmitButton(true); // Disable submit button and textarea while processing

    try {
        const response = await fetch(imageGenerationUrl, {
            method: 'POST',
            body: data,
            headers: { 'X-CSRFToken': csrfmiddlewaretoken },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            console.error("Server responded with an error:", response.statusText);
            typingBubble.remove();
            return { message: "Error: Unable to get response" };
        }

        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('image/')) {
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob);
            typingBubble.remove();

            return {
                message: `
                    <p style="margin-bottom: 10px;">
                        Image generated successfully!
                    </p>
                    <img src="${imageUrl}" alt="Generated Image" style="max-width: 100%; border-radius: 8px;">
                `
            };
        } else {
            const jsonResponse = await response.json();
            typingBubble.remove();

            if (jsonResponse.status === "success") {
                return {
                    message: `
                        <p style="margin-bottom: 10px;">
                            Image generated successfully!
                        </p>
                        <img src="${jsonResponse.result}" alt="Generated Image" style="max-width: 100%; border-radius: 8px;">
                    `
                };
            }
        }
    } catch (error) {
        console.error("Fetch error:", error);
        typingBubble.remove();
        return { message: "Error: Unable to fetch response" };
    } finally {
        toggleSubmitButton(false); // Re-enable submit button and textarea
        checkTextareaEmpty();
    }
  };

  // Handle submit button click
  submitButton.addEventListener("click", async (event) => {
    event.preventDefault();
    
    if (isProcessing) {
        return; // Prevent submission if already processing
    }

    const now = Date.now();
    if (now - lastSubmissionTime < RATE_LIMIT) {
        addChatBubble("Please wait a moment before generating another image.", true);
        return;
    }
    lastSubmissionTime = now;

    const userInput = typedPrompt.value.trim();
    if (!userInput) {
        return;
    }

    // Store the input before clearing
    const messageToSend = userInput;
    
    // Clear textarea immediately
    typedPrompt.value = "";
    typedPrompt.style.height = CONFIG.DEFAULT_TEXTAREA_HEIGHT;
    checkTextareaEmpty();
    typedPrompt.focus();

    // Add user message to chat
    addChatBubble(messageToSend, false);
    
    // Get and add bot response
    const response = await fetchData();
    addChatBubble(response.message || "Error: No message received", true);
  });

  // Also add form submission handler to ensure clearing works with form submit
  document.getElementById('imageForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.click(); // Trigger the same handler as the button click
  });

  // Add mobile device detection
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Handle Enter key press
  typedPrompt.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const isEmpty = !typedPrompt.value.trim();
        
        if (isEmpty || isProcessing) {
            event.preventDefault();
            return;
        }

        if (isMobileDevice()) {
            return true; // Allow new line on mobile
        } else {
            if (!event.shiftKey) {
                event.preventDefault();
                submitButton.click();
            }
        }
    }
  });

  // Handle textarea auto-resizing and empty check
  const autoResize = () => {
    const initialHeight = 50;
    typedPrompt.style.height = 'auto';
    const newHeight = typedPrompt.scrollHeight;
    typedPrompt.style.height = newHeight + 'px';
    typedPrompt.style.marginTop = `${initialHeight - newHeight}px`;
    checkTextareaEmpty(); // Check emptiness on input
  };

  typedPrompt.addEventListener('input', autoResize);
  
  // Initial check for empty textarea
  checkTextareaEmpty();
});
