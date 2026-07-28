require('dotenv').config();

async function callOpenRouter(chatHistory) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "your_openrouter_api_key_here" || apiKey === "YOUR_OPENROUTER_FREE_KEY") {
    return "Welcome to Zero Cut Studio! Please configure your OpenRouter API key on the backend.";
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: "You are a professional video editor assistant for Zero Cut Studio." },
          ...chatHistory.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
        ]
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Sorry, I am facing a minor glitch. Please ask again.";
  } catch (err) {
    return "Network error. Please try again.";
  }
}

module.exports = { callOpenRouter };