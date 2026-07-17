export default async function handler(req, res) {
  const { q } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Missing query parameter q" });
  }

  try {
    const searchUrl = `https://www.bim.com.tr/Categories/100/aktuel-urunler.aspx`;

    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), 25_000)
      : null;

    const response = await fetch(searchUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36",
        accept: "text/html",
      },
      signal: controller ? controller.signal : undefined,
    });

    if (timer) clearTimeout(timer);

    if (!response.ok) {
      return res
        .status(502)
        .json({ error: "bim-upstream-failed", status: response.status });
    }

    const html = await response.text();
    const items = [];

    const outerRe =
      /<div class="product col-xl-3 col-lg-3 col-md-4 col-sm-6[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    const titleRe = /<h2 class="title">([\s\S]*?)<\/h2>/;
    const brandRe = /<h2 class="subTitle">([\s\S]*?)<\/h2>/;
    const hrefRe = /<a href="([^"]+aktuel\.aspx)"[^>]*>/;
    const imgRe = /<img[^>]+src="([^"]+)"/;
    const priceRe = /([0-9]+(?:\.[0-9]{3})+)\s*₺?/;
    const textOnlyRe = />([^<]{3,120})</g;

    let match;
    let nodes = 0;
    while ((match = outerRe.exec(html)) !== null && nodes < 120) {
      nodes++;
      const node = match[0];

      const titleMatch = node.match(titleRe);
      const brandMatch = node.match(brandRe);
      const hrefMatch = node.match(hrefRe);
      const imgMatch = node.match(imgRe);

      if (!titleMatch || !hrefMatch || !imgMatch) continue;

      const title = titleMatch[1].trim();
      const brand = brandMatch ? brandMatch[1].trim() : "";
      const href = hrefMatch[1];
      const image = imgMatch[1];
      const name = `${brand} ${title}`.replace(/\s+/g, " ").trim();

      // Fallback price extraction from visible card text
      const textChunks = [];
      let textMatch;
      while ((textMatch = textOnlyRe.exec(node)) !== null) {
        const t = textMatch[1].trim();
        if (t) textChunks.push(t);
      }
      const textBlock = textChunks.join(" ");
      const priceMatch = textBlock.match(/([0-9]+(?:\.[0-9]{3})+)\s*₺?/);
      const price = priceMatch ? priceMatch[1] : null;

      let category = "Aktüel";
      if (/buzdolabı|buzdolabi|çamaşı|beyaz eşya/i.test(name))
        category = "Beyaz Eşya";
      else if (/cep telefon|tablet|kulak|tv|televiz/i.test(name))
        category = "Elektronik";
      else if (/süt|kahve|çay|içecek/i.test(name))
        category = "Gıda & İçecek";
      else if (/deterjan|temizlik/i.test(name)) category = "Temizlik";
      else if (/atıştırmalık|cips|çikolata|bisküvi|kek|gofret/i.test(name))
        category = "Atıştırmalık";

      items.push({
        name,
        brand,
        price,
        image,
        category,
        store: "BİM",
        url: `https://www.bim.com.tr${href.startsWith("/") ? "" : "/"}${href}`,
      });
    }

    return res.status(200).json({ query: q, count: items.length, items });
  } catch (e) {
    return res.status(500).json({ error: "bim-failed", message: String(e) });
  }
}
