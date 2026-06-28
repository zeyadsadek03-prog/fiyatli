
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
const loadMoreBtn = document.getElementById("load-more-btn");

let allResults = [];
let showingAll = false;

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

function filterResults(products, query) {
  const words = query.toLowerCase()
    .replace(/ı/g, 'i').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ö/g, 'o').replace(/ç/g, 'c')
    .split(' ')
    .filter(w => w.length > 2);

  const brand = words[0];

  const filtered = products.filter(p => {
    const name = p.name.toLowerCase()
      .replace(/ı/g, 'i').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ö/g, 'o').replace(/ç/g, 'c');
    return name.includes(brand);
  });

  return filtered;
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
    if (priceStr) {
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
    const items = filterResults(products, query);
    if (items.length === 0) {
      allResults = [];
      showingAll = false;
      loadMoreBtn.style.display = "none";
      show(noResultsSection);
    } else {
      allResults = items;
      showingAll = false;
      renderResults(allResults.slice(0, 3));
      if (allResults.length > 3) {
        loadMoreBtn.style.display = "block";
      } else {
        loadMoreBtn.style.display = "none";
      }
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
  setPhotoStatus("Fotoğraf analiz ediliyor...");
  resultsSection.style.display = "none";

  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const groqRes = await fetch("/api/vision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64 }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Vision API ${groqRes.status}: ${errText}`);
    }

    const groqData = await groqRes.json();
    const cleaned = (groqData.text || "").trim();

    console.log("Vision raw response:", groqData);
    console.log("Cleaned search text:", cleaned);

    if (!cleaned) {
      errorText.textContent = "Ürün okunamadı, lütfen daha net bir fotoğraf deneyin.";
      show(errorBox);
      setPhotoStatus("");
      return;
    }

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

loadMoreBtn.addEventListener("click", () => {
  if (!showingAll && allResults.length > 3) {
    showingAll = true;
    renderResults(allResults);
    loadMoreBtn.textContent = "Daha az göster";
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (showingAll && allResults.length > 3) {
    showingAll = false;
    renderResults(allResults.slice(0, 3));
    loadMoreBtn.textContent = "Daha fazla göster";
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

function animateOut(spans) {
  spans.forEach((span, i) => {
    span.style.transition = `transform 0.2s ease ${i * 0.03}s, opacity 0.2s ease ${i * 0.03}s`;
    span.style.transform = 'translateY(-120%)';
    span.style.opacity = '0';
  });
}

function animateIn(spans) {
  spans.forEach(span => {
    span.style.transition = 'none';
    span.style.transform = 'translateY(100%)';
    span.style.opacity = '0';
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      spans.forEach((span, i) => {
        span.style.transition = `transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.03}s, opacity 0.3s ease ${i * 0.03}s`;
        span.style.transform = 'translateY(0)';
        span.style.opacity = '1';
      });
    });
  });
}

function setWord(word) {
  const container = document.getElementById('rotate-word');
  container.innerHTML = '';
  const spans = word.split('').map(char => {
    const span = document.createElement('span');
    span.textContent = char;
    span.style.display = 'inline-block';
    span.style.overflow = 'hidden';
    container.appendChild(span);
    return span;
  });
  animateIn(spans);
  return spans;
}

const words = ['ucuz', 'hızlı', 'kolay', 'pratik'];
let index = 0;
let currentSpans = setWord(words[0]);

setInterval(() => {
  animateOut(currentSpans);
  setTimeout(() => {
    index = (index + 1) % words.length;
    currentSpans = setWord(words[index]);
  }, 300);
}, 2500);
