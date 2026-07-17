export default async function handler(req, res) {
  const { q } = req.query || {};
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing query ?q=' });
  }

  try {
    const url = `https://www.bim.com.tr/tr/Haftanin-Yildizlari` + (q ? `?q=${encodeURIComponent(q)}` : '');
    const resp = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
        accept: 'text/html',
      },
    });

    const html = await resp.text();
    if (!html) {
      return res.status(502).json({ error: 'Empty bim response' });
    }

    const $ = await import('cheerio').then(m => m.default || m).catch(() => null);
    if (!$) {
      return res.status(500).json({ error: 'cheerio unavailable in serverless runtime' });
    }

    const items = [];
    $('.product.col-xl-3.col-lg-3.col-md-4.col-sm-6.col-12').each((idx, el) => {
      const card = $(el);
      const title = card.find('h2.title').text().trim();
      const subTitle = card.find('h2.subTitle').text().trim();
      const href = card.find('a').first().attr('href') || '';
      const img = card.find('img').first().attr('src') || '';
      const raw = card.find('.descArea').text().trim();
      const priceMatch = raw.match(/([0-9]+(?:\.[0-9]{3})+)\s*[₺]/);

      if (!title) return;
      let category = 'Aktüel';
      if (/buzdolabı|buzdolabi|çamaşı|beyaz eşya/i.test(title + ' ' + subTitle)) category = 'Beyaz Eşya';
      else if (/cep telefon|tablet|kulak|tv|televiz/i.test(title)) category = 'Elektronik';
      else if (/süt|kahve|çay|içecek/i.test(title)) category = 'Gıda';
      else if (/deterjan|temizlik/i.test(title)) category = 'Temizlik';

      items.push({
        name: `${subTitle} ${title}`.trim(),
        brand: subTitle,
        price: priceMatch ? priceMatch[1] : null,
        image: img,
        category,
        store: 'BİM',
        url: href.startsWith('http') ? href : `https://www.bim.com.tr${href}`,
      });
    });

    res.status(200).json({ query: q, count: items.length, items });
  } catch (e) {
    res.status(500).json({ error: 'bim scrape failed', message: String(e) });
  }
}
