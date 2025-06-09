document.addEventListener("DOMContentLoaded", () => {
  const toggleSwitch = document.getElementById("toggle-theme");
  const emoji = document.getElementById("emoji");

  // Initialize the mode from local storage or default to light
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    toggleSwitch.checked = true;
  } else {
    document.body.classList.remove("dark-mode");
    toggleSwitch.checked = false;
  }

  // Toggle dark/light mode functionality
  toggleSwitch.addEventListener("change", () => {
    if (toggleSwitch.checked) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      emoji.textContent = "🌞"; // Change to sun emoji
      localStorage.setItem("theme", "light");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.querySelector("#chat-container");
  const typedPrompt = document.querySelector("#typedPrompt");
  const submit = document.querySelector("#submit");
  const csrfmiddlewaretoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

  // Helper function to escape HTML characters
  const escapeHTML = (str) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Helper function to render code correctly
  const renderCode = (text) => {
    // Check for code-like content using regular expressions
    const codeBlockPattern = /```[\s\S]*?```/g; // Matches text within triple backticks
    const htmlSafeText = text.replace(codeBlockPattern, (match) => {
      return `<pre><code>${match.slice(3, -3)}</code></pre>`;
    });
    return htmlSafeText;
  };

  // Helper function to add chat bubbles
  const addChatBubble = (text, isBot = false, isTyping = false) => {
    const bubble = document.createElement("div");
    bubble.classList.add("chat-bubble", isBot ? "bot-message" : "user-message");

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const typingHTML = `
      <em>Julie is typing<span class="dots"></span></em>
    `;

    // If the message is code-like, render it correctly
    const messageHTML = `
      <strong>${isBot ? "Julie" : "Ayush"}:</strong> ${isBot ? renderCode(text) : escapeHTML(text)}
      <span class="timestamp">${timestamp}</span>
    `;

    // Display typing indicator or actual message
    bubble.innerHTML = isTyping ? typingHTML : messageHTML;

    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Re-trigger animation for .dots
    if (isTyping) {
      const dotsElement = bubble.querySelector(".dots");
      if (dotsElement) {
        dotsElement.style.animation = "none"; // Stop any existing animation
        void dotsElement.offsetWidth; // Force a reflow to restart the animation
        dotsElement.style.animation = ""; // Reset the animation
      }
    }

    return bubble;
  };

  // Display typing indicator for Julie
  const showTypingIndicator = () => {
    const typingBubble = addChatBubble("", true, true); // Add typing bubble with dots animation
    return typingBubble;
  };

  // Send and receive messages
  const fetchData = async () => {
    const data = new FormData();
    data.append('prompt', typedPrompt.value);
    data.append('csrfmiddlewaretoken', csrfmiddlewaretoken);

    // Show typing indicator
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

      typingBubble.remove(); // Remove typing indicator

      if (!response.ok) {
        console.error("Server responded with an error:", response.statusText);
        return { message: "Error: Unable to get response" };
      }

      const jsonResponse = await response.json();
      console.log("Server response:", jsonResponse);

      // Return the HTML message received from the backend
      return { message: jsonResponse.message };
    } catch (error) {
      console.error("Fetch error:", error);
      return { message: "Error: Unable to fetch response" };
    }
  };

  // Event listener for the submit button
  submit.addEventListener("click", async () => {
    const userInput = typedPrompt.value;
    if (!userInput.trim()) {
      alert("Please type something!");
      return;
    }

    // Display the user's message in the chat
    addChatBubble(userInput, false);

    // Fetch response from backend
    const response = await fetchData();

    // Display the bot's response or an error message
    addChatBubble(response.message || "Error: No message received", true);

    // Clear the input field and set focus back
    typedPrompt.value = "";
    typedPrompt.focus();
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const typedPrompt = document.getElementById('typedPrompt');
  const submitButton = document.getElementById('submit');

  if (typedPrompt && submitButton) {
    function autoResize() {
      const initialHeight = 50; // Initial height of the textarea
      typedPrompt.style.height = 'auto'; // Reset height to allow shrink
      const newHeight = typedPrompt.scrollHeight; // Get new height
      typedPrompt.style.height = newHeight + 'px'; // Set height based on scrollHeight
    
      // Adjust the margin-top to simulate upward movement
      typedPrompt.style.marginTop = `${initialHeight - newHeight}px`;
    }
    

    function handleSubmit() {
      // Add your message processing logic here if needed (e.g., sending to the server)

      // Clear the textarea content
      typedPrompt.value = '';

      // Reset the height to the initial value
      typedPrompt.style.height = '50px';
    }

    // Attach autoResize function to the input event for real-time expansion
    typedPrompt.addEventListener('input', autoResize);

    // Attach handleSubmit function to the click event of the submit button
    submitButton.addEventListener('click', handleSubmit);
  } else {
    console.error("Error: 'typedPrompt' or 'submit' element not found.");
  }
});
document.getElementById('sidebar-toggle').addEventListener('click', function() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('.main-content');
  sidebar.classList.toggle('active');  // Toggle the sidebar visibility
  
  // Check if sidebar is active and adjust margin-left of the main content
  if (sidebar.classList.contains('active')) {
    mainContent.style.marginLeft = '0';  // Shift content when sidebar is open
  } else {
    mainContent.style.marginLeft = '0';  // Reset when sidebar is closed
  }
});