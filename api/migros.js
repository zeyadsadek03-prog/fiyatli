export default function handler(req, res) {
  const { q } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Missing query parameter q" });
  }

  const url = `https://www.migros.com.tr/rest/search/screens/products?q=${encodeURIComponent(q)}`;

  fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      referer: `https://www.migros.com.tr/arama?q=${encodeURIComponent(q)}`,
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-device-pwa": "true",
      "x-forwarded-rest": "true",
      "x-pwa": "true",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((data) => res.status(200).json(data))
    .catch((error) =>
      res.status(500).json({ error: error.message || "Migros fetch failed" })
    );
}
