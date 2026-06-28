module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY not configured" });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: `Extract only the product name from this OCR text. Return just the product name, nothing else: ${text}`,
          },
        ],
        temperature: 0,
        max_tokens: 40,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `Groq API error: ${response.status}`,
        details: errText,
      });
    }

    const data = await response.json();
    const cleaned = (data.choices?.[0]?.message?.content || "").trim();

    return res.status(200).json({ cleaned });
  } catch (err) {
    console.error("groq proxy error:", err);
    return res.status(500).json({ error: "Groq proxy failed" });
  }
};
