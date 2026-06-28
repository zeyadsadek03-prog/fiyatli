const Tesseract = require("tesseract.js");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: "Missing image" });
    }

    // strip data URL prefix if present
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const result = await Tesseract.recognize(buffer, "tur", {
      logger: () => {},
    });

    const text = (result?.data?.text || "").trim();

    if (!text) {
      return res.status(200).json({ error: "No text recognized" });
    }

    // reuse search logic
    const url = new URL("https://a101-ecom.wawlabs.com/search");
    url.searchParams.set("q", text);
    url.searchParams.set("rpp", "20");
    url.searchParams.set("pn", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "origin": "https://www.a101.com.tr",
        "referer": "https://www.a101.com.tr/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `A101 API error: ${response.status}`,
      });
    }

    const data = await response.json();
    const results = (data.res || []).map((item) => {
      const price = item.attributes?.discountedText || "";
      const image =
        (item.images && item.images.length > 0 && item.images[0].url) || "";
      return {
        name: item.name || "",
        price,
        url: item.url || "",
        image,
      };
    });

    return res.status(200).json({ results, text });
  } catch (err) {
    console.error("photosearch error:", err);
    return res.status(500).json({ error: "Photo search failed" });
  }
};
