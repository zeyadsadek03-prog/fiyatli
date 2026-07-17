export default function handler(req, res) {
  const { q } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Missing query parameter q" });
  }

  const searchUrl = `https://www.bim.com.tr/tr/Haftanin-Yildizlari` + (q ? `?q=${encodeURIComponent(q)}` : '');

  fetch(searchUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36",
      accept: "text/html",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    })
    .then((html) => {
      const items = [];
      const cardRe = /<div class="product col-xl-3 col-lg-3 col-md-4 col-sm-6[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
      const nodes = [];

      let m;
      while ((m = cardRe.exec(html)) !== null) {
        nodes.push(m[0]);
      }

      for (const node of nodes) {
        const subTitleMatch = node.match(/<h2 class="subTitle">([\s\S]*?)<\/h2>/);
        const titleMatch = node.match(/<h2 class="title">([\s\S]*?)<\/h2>/);
        const hrefMatch = node.match(/<a href="([^"]+aktuel\.aspx)"[^>]*>/);
        const imgMatch = node.match(/<img[^>]+src="([^"]+)"/);
        const priceMatch = node.match(/([0-9]+(?:\.[0-9]{3})+)\s*[₺]/);

        if (!titleMatch) continue;

        const title = titleMatch[1].trim();
        const brand = subTitleMatch ? subTitleMatch[1].trim() : '';
        const price = priceMatch ? priceMatch[1] : null;
        const image = imgMatch ? imgMatch[1] : '';
        const href = hrefMatch ? hrefMatch[1] : '';
        const name = `${brand} ${title}`.replace(/\s+/g, ' ').trim();

        let category = 'Aktüel';
        if (/buzdolabı|buzdolabi|çamaşı|beyaz eşya/i.test(name)) category = 'Beyaz Eşya';
        else if (/cep telefon|tablet|kulak|tv|televiz/i.test(name)) category = 'Elektronik';
        else if (/süt|kahve|çay|içecek/i.test(name)) category = 'Gıda & İçecek';
        else if (/deterjan|temizlik/i.test(name)) category = 'Temizlik';
        else if (/atıştırmalık|cips|çikolata|bisküvi|kek|gofret/i.test(name)) category = 'Atıştırmalık';

        items.push({
          name,
          brand,
          price,
          image,
          category,
          store: 'BİM',
          url: href ? `https://www.bim.com.tr${href.startsWith('/') ? '' : '/'}${href}` : '#',
        });
      }

      res.status(200).json({ query: q, count: items.length, items });
    })
    .catch((error) =>
      res.status(500).json({ error: error.message || 'Bim fetch failed' })
    ));
}
