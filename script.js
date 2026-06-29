const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const apiKeyInput = document.getElementById("apiKeyInput");

async function fetchAIResponse(userText, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
    return "Sorry, I am having trouble connecting to the AI right now.";
  }
}

function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
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

  const reply = await fetchAIResponse(text, apiKey);
  addMessage(reply, "bot");
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

addMessage("👋 Hello! I'm the Programming Chatbot. You can ask me questions about programming! 😄", "bot");
