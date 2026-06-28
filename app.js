
const form = document.getElementById("search-form");
const queryInput = document.getElementById("query");
const resultsSection = document.getElementById("results");
const resultsList = document.getElementById("results-list");
const noResultsSection = document.getElementById("no-results");
const errorBox = document.getElementById("error-box");
const errorText = document.getElementById("error-text");
const photoBtn = document.getElementById("photo-search-btn");
const photoInput = document.getElementById("photo-input");
const photoStatus = document.getElementById("photo-status");

function show(section) {
  [resultsSection, noResultsSection, errorBox].forEach((el) => {
    el.style.display = "none";
  });
  section.style.display = "";
}

function formatPrice(price) {
  if (!price) return "";
  const normalized = price.replace(/\./g, "").replace(",", ".");
  const num = Number.parseFloat(normalized);
  if (Number.isNaN(num)) return price;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(num);
}

function normalizeTurkish(text) {
  return text
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

function filterDedupAndLimit(items, query) {
  const queries = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => normalizeTurkish(w));

  const seen = new Set();
  const out = [];

  for (const item of items) {
    const name = item.name || item.attributes?.name || "";
    const normalizedName = normalizeTurkish(name);

    // Must match at least one query word
    const matches = queries.some((q) => normalizedName.includes(q));
    if (!matches) continue;

    // Deduplicate by exact name
    if (seen.has(normalizedName)) continue;
    seen.add(normalizedName);

    out.push(item);
    if (out.length >= 8) break;
  }

  return out;
}

function renderResults(items) {
  resultsList.innerHTML = "";
  items.forEach((item) => {
    const a = document.createElement("a");
    a.className = "result-item";
    a.href = item.url || item.attributes?.url || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.className = "result-image";
    const imageUrl =
      item.image_url ||
      item.attributes?.image_url ||
      item.attributes?.imageUrl ||
      (item.images && item.images.length > 0 && item.images[0].url) ||
      "";
    img.src = imageUrl || "";
    img.alt = item.name || "";
    img.loading = "lazy";

    img.onerror = () => {
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3Ctext x='40' y='45' text-anchor='middle' fill='%239ca3af' font-size='12'%3EResim Yok%3C/text%3E%3C/svg%3E";
    };

    const body = document.createElement("div");
    body.className = "result-body";

    const name = document.createElement("p");
    name.className = "result-name";
    name.textContent = item.name || item.attributes?.name || "";

    const price = document.createElement("p");
    price.className = "result-price";

    const priceStr =
      item.price_str ||
      item.attributes?.price_str ||
      item.attributes?.priceText ||
      "";
    const discountedPriceStr =
      item.discounted_price_str ||
      item.attributes?.discounted_price_str ||
      item.attributes?.discountedText ||
      "";
    const hasDiscount =
      item.discounted_price != null ||
      item.attributes?.discounted_price != null ||
      Boolean(discountedPriceStr);

    if (hasDiscount && discountedPriceStr) {
      const original = document.createElement("span");
      original.className = "price-original";
      original.textContent = priceStr || "";
      const discounted = document.createElement("span");
      discounted.className = "price-discounted";
      discounted.textContent = discountedPriceStr;
      price.appendChild(original);
      price.appendChild(discounted);
    } else if (priceStr) {
      price.textContent = priceStr;
    }

    body.appendChild(name);
    body.appendChild(price);
    a.appendChild(img);
    a.appendChild(body);
    resultsList.appendChild(a);
  });
}

async function searchText(query) {
  show(resultsSection);
  resultsSection.style.display = "none";
  resultsList.innerHTML = "";

  try {
    const base = "https://a101-util.wawlabs.com/combined_api_v2";
    const payload = JSON.stringify({
      query,
      filter: [],
      sort: [],
      page_number: 1,
      row_per_page: 20,
    });
    const url = `${base}?&q=${encodeURIComponent(query)}&location=VS032-SLOT&json_data=${encodeURIComponent(payload)}`;

    const response = await fetch(url, {
      mode: "cors",
      headers: {
        "Referer": "https://www.a101.com.tr",
        "Origin": "https://www.a101.com.tr",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("search response:", data);
    const products = Array.isArray(data?.products) ? data.products : [];
    if (products.length > 0) {
      console.log("first product sample:", JSON.stringify(products[0], null, 2));
    }
    const items = filterDedupAndLimit(products, query);
    if (items.length === 0) {
      show(noResultsSection);
    } else {
      renderResults(items);
      show(resultsSection);
    }
  } catch (err) {
    console.error(err);
    errorText.textContent = "Arama başarısız oldu. Lütfen tekrar deneyin.";
    show(errorBox);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = queryInput.value.trim();
  if (!q) return;
  searchText(q);
});

function setPhotoStatus(message) {
  photoStatus.textContent = message;
  photoStatus.style.display = message ? "block" : "none";
}

async function runPhotoSearch(file) {
  setPhotoStatus("Fotoğraf okunuyor...");
  resultsSection.style.display = "none";

  try {
    const result = await Tesseract.recognize(file, "tur");
    const rawText = (result?.data?.text || "").trim();

    console.log("Tesseract raw OCR text:", rawText);

    if (!rawText) {
      errorText.textContent = "Fotoğraftan metin okunamadı.";
      show(errorBox);
      setPhotoStatus("");
      return;
    }

    let cleaned = "";
    try {
      setPhotoStatus("Ürün adı bulunuyor...");

      const groqRes = await fetch("/api/groq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: rawText }),
      });

      console.log("Groq response status:", groqRes.status);

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        console.error("Groq API non-OK:", groqRes.status, errText);
      } else {
        const groqData = await groqRes.json();
        console.log("Groq response data:", groqData);
        cleaned = (groqData.cleaned || "").trim();
      }
    } catch (groqErr) {
      console.error("Groq request failed:", groqErr);
    }

    const rejectionWords = ["unable", "cannot", "sorry", "incomplete", "however", "provide"];
    const looksInvalid = rejectionWords.some((word) =>
      cleaned.toLowerCase().includes(word)
    );
    if (looksInvalid) {
      console.log("Groq output rejected as invalid, using raw OCR text");
      cleaned = rawText;
    }

    if (!cleaned) {
      errorText.textContent = "Ürün okunamadı, lütfen daha net bir fotoğraf deneyin.";
      show(errorBox);
      setPhotoStatus("");
      return;
    }

    console.log("Final search query:", cleaned);
    queryInput.value = cleaned;
    setPhotoStatus("");
    await searchText(cleaned);
  } catch (err) {
    console.error("Photo search error:", err);
    errorText.textContent = "Fotoğraf ile arama başarısız oldu.";
    show(errorBox);
    setPhotoStatus("");
  }
}

photoBtn.addEventListener("click", () => {
  photoInput.click();
});

photoInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  runPhotoSearch(file);
});
