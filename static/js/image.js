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
      emoji.textContent = "🌞"; // Change to sun emoji
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

  // Display typing indicator for Julie
  const showTypingIndicator = () => addChatBubble("", true, true);

  // Handle form submission to fetch data
  const fetchData = async () => {
    const data = new FormData();
    const apiChoice = document.querySelector("#api").value;
    data.append('prompt', typedPrompt.value);
    data.append('api', apiChoice);
    data.append('csrfmiddlewaretoken', csrfmiddlewaretoken);

    const typingBubble = showTypingIndicator();  // Show typing indicator

    try {
        const response = await fetch(imageGenerationUrl, {
            method: 'POST',
            body: data,
            headers: { 'X-CSRFToken': csrfmiddlewaretoken },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            console.error("Server responded with an error:", response.statusText);
            typingBubble.remove();  // Ensure typing bubble is removed
            return { message: "Error: Unable to get response" };
        }

        // Check if the response is a JSON or an image (Blob)
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('image/')) {
            // Handle the response as an image (Blob)
            const imageBlob = await response.blob();
            const imageUrl = URL.createObjectURL(imageBlob); // Create an object URL for the image

            typingBubble.remove();  // Remove typing bubble after image is ready

            return {
                message: `
                    <p style="margin-bottom: 10px;">
                        Image generated successfully!
                    </p>
                    <img src="${imageUrl}" alt="Generated Image" style="max-width: 100%; border-radius: 8px;">
                `
            };
        } else {
            // If the response is JSON (used for logs or error messages)
            const jsonResponse = await response.json();
            typingBubble.remove();  // Remove typing bubble after receiving the response

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
        typingBubble.remove();  // Remove typing bubble in case of error
        return { message: "Error: Unable to fetch response" };
    }
};



  // Handle submit button click
  submitButton.addEventListener("click", async (event) => {
    event.preventDefault();
    const userInput = typedPrompt.value.trim();
    if (!userInput) {
      alert("Please type something!");
      return;
    }

    addChatBubble(userInput, false); // Add user's message
    const response = await fetchData();
    addChatBubble(response.message || "Error: No message received", true); // Add bot's response

    // Clear the textarea and reset its height to original size
    typedPrompt.value = "";  // Clear input field
    typedPrompt.style.height = 'auto'; // Reset the height to the default
    typedPrompt.focus(); // Focus back on input
  });

  // Handle textarea auto-resizing
  const autoResize = () => {
    const initialHeight = 50; // Initial height of the textarea
      typedPrompt.style.height = 'auto'; // Reset height to allow shrink
      const newHeight = typedPrompt.scrollHeight; // Get new height
      typedPrompt.style.height = newHeight + 'px'; // Set height based on scrollHeight
    
      // Adjust the margin-top to simulate upward movement
      typedPrompt.style.marginTop = `${initialHeight - newHeight}px`;
  };

  typedPrompt.addEventListener('input', autoResize);
});