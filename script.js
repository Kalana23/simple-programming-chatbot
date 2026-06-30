const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const apiKeyInput = document.getElementById("apiKeyInput");
const connectBtn = document.getElementById("connectBtn");
const clearBtn = document.getElementById("clearBtn");
const micBtn = document.getElementById("micBtn");

let conversationHistory = [];

// Connect Button Logic
if (connectBtn) {
  connectBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showToast("Please enter an API Key first.", false);
      return;
    }

    connectBtn.disabled = true;
    connectBtn.innerText = "Connecting...";

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

      const response = await fetch(url, {
        method: "GET"
      });

      if (response.ok) {
        showToast("API Key Connected Successfully! 🚀", true);
      } else {
        showToast("Invalid API Key or connection error.", false);
      }
    } catch (error) {
      console.error("Connection validation error:", error);
      showToast("Network error. Could not validate.", false);
    } finally {
      connectBtn.disabled = false;
      connectBtn.innerText = "Connect";
    }
  });
}

// Clear Chat Functionality
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    conversationHistory = [];
    chatBox.innerHTML = "";
    addMessage("👋 Hello! I'm the Programming Chatbot. You can ask me questions about programming! 😄", "bot");
  });
}

// Voice Input Functionality
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecording = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add("listening");
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    userInput.value = transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    isRecording = false;
    micBtn.classList.remove("listening");
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove("listening");
  };

  micBtn.addEventListener("click", () => {
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
} else {
  micBtn.style.display = "none";
  console.warn("Speech Recognition API not supported in this browser.");
}

async function fetchAIResponseStream(userText, apiKey, msgElement) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  conversationHistory.push({
    role: "user",
    parts: [{ text: userText }]
  });

  const payload = {
    contents: conversationHistory
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;
    let fullText = "";
    let buffer = "";

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace(/^data:\s*/, '').trim();
            if (dataStr && dataStr !== '[DONE]') {
              try {
                const data = JSON.parse(dataStr);
                if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                   fullText += data.candidates[0].content.parts[0].text;
                   msgElement.innerHTML = sanitizeHTML(fullText);
                   chatBox.scrollTop = chatBox.scrollHeight;
                }
              } catch (e) {
                console.error("Error parsing JSON:", e, dataStr);
              }
            }
          }
        }
      }
    }

    conversationHistory.push({
      role: "model",
      parts: [{ text: fullText }]
    });

  } catch (error) {
    console.error("Error fetching AI response:", error);
    conversationHistory.pop();
    msgElement.innerHTML = sanitizeHTML("Sorry, I am having trouble connecting to the AI right now. Please check your API key and connection.");
  }
}

// Configure marked.js with highlight.js
const { markedHighlight } = globalThis.markedHighlight;
marked.use(markedHighlight({
  emptyLangClass: 'hljs',
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

// // XSS Protection and markdown parsing
function sanitizeHTML(str) {
  // Parse markdown to HTML
  const rawHtml = marked.parse(str, { breaks: true });
  // Wrap pre tags with a div and a copy button
  const htmlWithWrapper = rawHtml.replace(/<pre>/g, '<div class="code-block-wrapper"><button class="copy-btn">Copy</button><pre>');
  const htmlWithWrapperEnd = htmlWithWrapper.replace(/<\/pre>/g, '</pre></div>');
  // Sanitize to prevent XSS
  return DOMPurify.sanitize(htmlWithWrapperEnd);
}

// Event Delegation for Copy Buttons
chatBox.addEventListener("click", function(e) {
  if (e.target.classList.contains("copy-btn")) {
    const pre = e.target.nextElementSibling;
    if (pre && pre.tagName === 'PRE') {
      const code = pre.innerText;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = e.target.innerText;
        e.target.innerText = "Copied!";
        setTimeout(() => e.target.innerText = originalText, 2000);
      });
    }
  }
});

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerHTML = sanitizeHTML(text);
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    addMessage("Please enter a valid Gemini API Key above to continue.", "error-msg");
    return;
  }

  const text = userInput.value.trim();
  if (!text) return;
  
  addMessage(text, "user");
  userInput.value = "";

  // Displaying a 'Thinking...' message while the bot searches for the answer
  const typingMsg = document.createElement("div");
  typingMsg.classList.add("message", "bot");
  typingMsg.textContent = "Thinking...";
  chatBox.appendChild(typingMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Sending the request to the API via streaming
  await fetchAIResponseStream(text, apiKey, typingMsg);
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Toast Notification System
function showToast(message, isSuccess) {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.classList.add("toast");
  if (isSuccess) {
    toast.classList.add("success");
  } else {
    toast.classList.add("error");
  }
  toast.innerText = message;

  toastContainer.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.add("exiting");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 3000);
}

// Chat loading
addMessage("👋 Hello! I'm the Programming Chatbot. You can ask me questions about programming! 😄", "bot");
