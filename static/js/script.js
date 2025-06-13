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

  const fetchData = async () => {
    const data = new FormData();
    data.append('prompt', typedPrompt.value);
    data.append('csrfmiddlewaretoken', csrfmiddlewaretoken);
    const typingBubble = showTypingIndicator();

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
    }
  };

  // Auto-resize on input
  typedPrompt.addEventListener('input', () => {
    typedPrompt.style.height = 'auto';
    typedPrompt.style.height = typedPrompt.scrollHeight + 'px';
  });

  // Handle message send
  async function handleSubmit() {
    const userInput = typedPrompt.value.trim();
    if (!userInput) {
      alert("Please type something!");
      return;
    }

    addChatBubble(userInput, false);

    const response = await fetchData();
    addChatBubble(response.message || "Error: No message received", true);

    typedPrompt.value = '';
    typedPrompt.style.height = '50px';
    typedPrompt.focus();
  }

  // Submit button click
  submit.addEventListener("click", handleSubmit);

  // Enter key submit
  typedPrompt.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
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
});
