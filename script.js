const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const apiKeyInput = document.getElementById("apiKeyInput");

async function fetchAIResponse(userText, apiKey) {
  // The URL must have an equal sign (=).
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [{ text: userText }]
    }]
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

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
       return data.candidates[0].content.parts[0].text;
    } else {
       return "I could not process the response. Please try again.";
    }
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return "Sorry, I am having trouble connecting to the AI right now. Please check your API key and connection.";
  }
}

// // XSS Protection and detection of new lines (Line breaks) sent by Gemini
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  // Converting newlines into HTML <br> tags
  return temp.innerHTML.replace(/\n/g, '<br>');
}

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
  typingMsg.id = "typingIndicator";
  chatBox.appendChild(typingMsg);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Sending the request to the API
  const reply = await fetchAIResponse(text, apiKey);
  
  // 'Thinking...' massage
  const indicator = document.getElementById("typingIndicator");
  if (indicator) {
      chatBox.removeChild(indicator);
  }
  
  addMessage(reply, "bot");
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Chat loading
addMessage("👋 Hello! I'm the Programming Chatbot. You can ask me questions about programming! 😄", "bot");
