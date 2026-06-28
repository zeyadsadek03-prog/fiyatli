const form = document.getElementById("search-form");
const queryInput = document.getElementById("query");
const searchBox = document.querySelector(".search-box");

const resultsSection = document.getElementById("results");
const resultsList = document.getElementById("results-list");
const resultsCount = document.getElementById("results-count");
const noResultsSection = document.getElementById("no-results");
const emptyState = document.getElementById("empty-state");
const emptyText = emptyState ? emptyState.querySelector(".no-results-msg") : null;
const errorBox = document.getElementById("error-box");
const errorText = document.getElementById("error-text");
const photoBtn = document.getElementById("photo-search-btn");
const photoInput = document.getElementById("photo-input");
const photoStatus = document.getElementById("photo-status");
const loadMoreBtn = document.getElementById("load-more-btn");
const idleState = document.getElementById("idle-state");
const loadingState = document.getElementById("loading-state");

let allResults = [];
let showingAll = false;
let currentQuery = "";

function setView(state) {
  const sections = [resultsSection, noResultsSection, errorBox, idleState, loadingState, emptyState];
  sections.forEach((el) => { if (el) el.style.display = "none"; });

  if (state === "results" && resultsSection) resultsSection.style.display = "";
  else if (state === "no-results" && noResultsSection) noResultsSection.style.display = "";
  else if (state === "error" && errorBox) errorBox.style.display = "";
  else if (state === "idle" && idleState) idleState.style.display = "";
  else if (state === "loading" && loadingState) loadingState.style.display = "";
  else if (state === "empty" && emptyState) emptyState.style.display = "";
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
    .replace(/ı/g, "i").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ö/g, "o").replace(/ç/g, "c")
    .split(" ")
    .filter(w => w.length > 2);

  const brand = words[0];

  const filtered = products.filter((p) => {
    const name = (p.name || p.attributes?.name || "").toLowerCase()
      .replace(/ı/g, "i").replace(/ü/g, "u")
      .replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ö/g, "o").replace(/ç/g, "c");
    return name.includes(brand);
  });

  return filtered;
}

function extractPrice(item) {
  return (
    item.price_str ||
    item.attributes?.price_str ||
    item.attributes?.priceText ||
    ""
  );
}

function extractOldPrice(item) {
  return (
    item.old_price_str ||
    item.attributes?.old_price ||
    item.attributes?.originalPrice ||
    ""
  );
}

function extractImage(item) {
  return (
    item.image_url ||
    item.attributes?.image_url ||
    item.attributes?.imageUrl ||
    (item.images && item.images.length > 0 && item.images[0].url) ||
    ""
  );
}

function extractUrl(item) {
  return item.url || item.attributes?.url || "#";
}

function renderResults(items) {
  resultsList.innerHTML = "";
  items.forEach((item) => {
    const url = extractUrl(item);
    const a = document.createElement("a");
    a.className = "result-item";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const imageUrl = extractImage(item);
    const img = document.createElement("img");
    img.className = "result-image";
    img.src = imageUrl || "";
    img.alt = item.name || item.attributes?.name || "";
    img.loading = "lazy";

    if (imageUrl) {
      img.onload = () => img.classList.add("loaded");
      img.onerror = () => {
        img.src =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3Ctext x='40' y='45' text-anchor='middle' fill='%239ca3af' font-size='12'%3EResim Yok%3C/text%3E%3C/svg%3E";
        img.classList.add("loaded");
      };
    } else {
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3Ctext x='40' y='45' text-anchor='middle' fill='%239ca3af' font-size='12'%3EResim Yok%3C/text%3E%3C/svg%3E";
      img.classList.add("loaded");
    }

    const a101Badge = document.createElement("span");
    a101Badge.className = "a101-badge-img";
    a101Badge.textContent = "A101";

    const wrap = document.createElement("div");
    wrap.className = "result-image-wrap";
    wrap.appendChild(img);
    wrap.appendChild(a101Badge);

    const discount = (item.discount || item.attributes?.discount || 0);
    if (discount > 0) {
      const db = document.createElement("span");
      db.className = "discount-badge";
      db.textContent = `%${discount}`;
      wrap.appendChild(db);
    }

    const inStock = item.attributes?.inStock;
    if (inStock === false) {
      const stockBadge = document.createElement("div");
      stockBadge.className = "out-of-stock";
      stockBadge.textContent = "Tükendi";
      wrap.appendChild(stockBadge);
    }

    const body = document.createElement("div");
    body.className = "result-body";

    const top = document.createElement("div");

    const name = document.createElement("p");
    name.className = "result-name";
    name.textContent = item.name || item.attributes?.name || "";
    top.appendChild(name);

    const category = item.attributes?.category || "";
    if (category) {
      const cat = document.createElement("span");
      cat.className = "result-category";
      cat.textContent = category;
      top.appendChild(cat);
    }

    body.appendChild(top);

    const footer = document.createElement("div");
    footer.className = "result-footer";

    const priceWrap = document.createElement("div");
    priceWrap.style.display = "flex";
    priceWrap.style.alignItems = "baseline";
    priceWrap.style.gap = "4px";

    const priceStr = extractPrice(item);
    const priceText = formatPrice(priceStr);
    const oldPriceStr = extractOldPrice(item);
    const oldPriceText = priceText && oldPriceStr ? formatPrice(oldPriceStr) : "";

    const priceEl = document.createElement("span");
    priceEl.className = "result-price";
    priceEl.textContent = priceText ? `₺${priceText}` : "";

    priceWrap.appendChild(priceEl);

    if (oldPriceText) {
      const old = document.createElement("span");
      old.className = "result-old-price";
      old.textContent = `₺${oldPriceText}`;
      priceWrap.appendChild(old);
    }

    footer.appendChild(priceWrap);

    const action = document.createElement("button");
    action.className = "result-action";
    action.type = "button";
    action.setAttribute("aria-label", "Ürün detayına git");
    action.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    action.addEventListener("click", (e) => {
      e.preventDefault();
      window.open(url, "_blank", "noopener,noreferrer");
    });

    footer.appendChild(action);
    body.appendChild(footer);

    a.appendChild(wrap);
    a.appendChild(body);
    resultsList.appendChild(a);
  });

  if (resultsCount) {
    resultsCount.textContent = `${items.length} ürün bulundu`;
  }
}

async function searchText(query) {
  setView("loading");
  currentQuery = query;

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
        Referer: "https://www.a101.com.tr",
        Origin: "https://www.a101.com.tr",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
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
      setView("empty");
      if (emptyText) {
        emptyText.innerHTML = `"<span style="font-weight:700;color:inherit">${query}</span>" için ürün bulunamadı. Farklı bir arama deneyin.`;
      }
    } else {
      allResults = items;
      showingAll = false;
      renderResults(allResults.slice(0, 3));
      loadMoreBtn.style.display = allResults.length > 3 ? "block" : "none";
      loadMoreBtn.textContent = "Daha fazla göster";
      setView("results");
    }
  } catch (err) {
    console.error(err);
    errorText.textContent = "Arama başarısız oldu. Lütfen tekrar deneyin.";
    setView("error");
  }
}

function setPhotoStatus(message) {
  photoStatus.textContent = message;
  photoStatus.style.display = message ? "block" : "none";
}

async function runPhotoSearch(file) {
  setPhotoStatus("Fotoğraf analiz ediliyor...");
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
      setView("error");
      setPhotoStatus("");
      return;
    }

    queryInput.value = cleaned;
    setPhotoStatus("");
    await searchText(cleaned);
  } catch (err) {
    console.error("Photo search error:", err);
    errorText.textContent = "Fotoğraf ile arama başarısız oldu.";
    setView("error");
    setPhotoStatus("");
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = queryInput.value.trim();
  if (!q) return;
  searchText(q);
});

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

queryInput.addEventListener("focus", () => {
  searchBox.classList.add("focused");
});

queryInput.addEventListener("blur", () => {
  searchBox.classList.remove("focused");
});

setView("idle");

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
