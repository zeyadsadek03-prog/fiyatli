module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: "Missing image" });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("vision proxy error: missing GROQ_API_KEY");
      return res.status(500).json({ error: "Vision proxy misconfigured", details: "GROQ_API_KEY not set" });
    }
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What product is shown in this image? Reply with only the brand name and product name, maximum 4 words, nothing else." },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
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
    const text = (data.choices?.[0]?.message?.content || "").trim();

    return res.status(200).json({ text });
  } catch (err) {
    console.error("vision proxy error:", err);
    return res.status(500).json({ error: "Vision proxy failed" });
  }
};
