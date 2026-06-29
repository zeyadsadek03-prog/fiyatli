const form = document.getElementById("search-form");
const queryInput = document.getElementById("query");
const searchBox = document.querySelector(".search-box");

const resultsSection = document.getElementById("results");
const a101List = document.getElementById("a101-list");
const a101Count = document.getElementById("a101-count");
const a101Error = document.getElementById("a101-error");
const migrosList = document.getElementById("migros-list");
const migrosCount = document.getElementById("migros-count");
const migrosError = document.getElementById("migros-error");
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

let a101AllResults = [];
let migrosAllResults = [];
let perStoreLimit = 1;
let currentQuery = "";

const STORE_LIMIT_PROGRESSION = [1, 3, 6]; // 1 -> 3 -> 6 -> +3 each subsequent click

function getNextLimit(current) {
  if (current < 6) {
    const idx = STORE_LIMIT_PROGRESSION.indexOf(current);
    if (idx !== -1 && idx < STORE_LIMIT_PROGRESSION.length - 1) {
      return STORE_LIMIT_PROGRESSION[idx + 1];
    }
  }
  return current + 3;
}

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

function renderResults(items, listEl, countEl, badgeText = "A101") {
  listEl.innerHTML = "";
  items.forEach((item, index) => {
    const url = extractUrl(item);
    const a = document.createElement("a");
    a.className = "result-item";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    a.classList.add("blur-fade-item");
    a.style.transitionDelay = `${index * 0.15}s`;

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

    const storeBadge = document.createElement("span");
    storeBadge.className = "a101-badge-img";
    storeBadge.textContent = badgeText;

    const wrap = document.createElement("div");
    wrap.className = "result-image-wrap";
    wrap.appendChild(img);
    wrap.appendChild(storeBadge);

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
    priceEl.textContent = priceText || "";

    priceWrap.appendChild(priceEl);

    if (oldPriceText) {
      const old = document.createElement("span");
      old.className = "result-old-price";
      old.textContent = oldPriceText || "";
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
    listEl.appendChild(a);
  });

  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  listEl.querySelectorAll(".blur-fade-item").forEach((el) => {
    fadeObserver.observe(el);
  });

  if (countEl) {
    countEl.textContent = `${items.length} sonuç`;
  }
}

async function searchText(query) {
  const sanitized = query.replace(/<[^>]*>/g, "").trim();
  if (!sanitized) {
    setView("empty");
    if (emptyText) {
      emptyText.textContent = "Geçersiz arama";
    }
    return;
  }

  setView("loading");
  currentQuery = sanitized;
  perStoreLimit = 1;

  // Clear columns
  a101List.innerHTML = "";
  a101Count.textContent = "";
  a101Error.style.display = "none";
  migrosList.innerHTML = "";
  migrosCount.textContent = "";
  migrosError.style.display = "none";

  // Show per-column loading skeletons
  setColumnLoading(a101List);
  setColumnLoading(migrosList);

  let a101Settled = false;
  let migrosSettled = false;

  function checkAllSettled() {
    if (a101Settled && migrosSettled) {
      if (a101List.children.length === 0 && migrosList.children.length === 0) {
        setView("empty");
        if (emptyText) {
          emptyText.innerHTML = `"<span style="font-weight:700;color:inherit">${sanitized}</span>" için ürün bulunamadı. Farklı bir arama deneyin.`;
        }
      } else {
        setView("results");
      }
      updateLoadMore();
    }
  }

  searchA101(sanitized)
    .then(() => {
      a101Settled = true;
      checkAllSettled();
    })
    .catch(() => {
      a101Error.textContent = "A101 results unavailable";
      a101Error.style.display = "";
      a101Settled = true;
      checkAllSettled();
    });

  searchMigros(sanitized)
    .then(() => {
      migrosSettled = true;
      checkAllSettled();
    })
    .catch(() => {
      migrosError.textContent = "Migros results unavailable";
      migrosError.style.display = "";
      migrosSettled = true;
      checkAllSettled();
    });
}

function setColumnLoading(listEl) {
  listEl.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div>
          <div class="skeleton-line long"></div>
          <div class="skeleton-line medium" style="margin-top:6px;"></div>
        </div>
        <div class="skeleton-price"></div>
      </div>
    `;
    listEl.appendChild(card);
  }
}

function updateLoadMore() {
  const a101HasMore = a101AllResults.length > perStoreLimit;
  const migrosHasMore = migrosAllResults.length > perStoreLimit;
  if (a101HasMore || migrosHasMore) {
    loadMoreBtn.style.display = "block";
    loadMoreBtn.textContent = "Daha fazla göster";
  } else {
    loadMoreBtn.style.display = "none";
  }
}

function rerankItems(items, query, brandList = []) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return items;

  const brandSet = new Set(
    brandList.map(b => b.toLowerCase()).filter(Boolean)
  );

  const scored = items.map((item, index) => {
    const nameLower = (item.name || '').toLowerCase();
    let score = 0;
    let brandTokensMatched = 0;

    for (const token of tokens) {
      if (nameLower.includes(token)) {
        if (brandSet.has(token)) {
          score += 10;
          brandTokensMatched++;
        } else {
          score += 3;
        }
      }
    }

    const phrase = tokens.join(' ');
    if (nameLower.includes(phrase)) {
      score += 5;
    }

    console.debug(`[rerank] "${item.name}" score=${score}`);
    return { item, score, index };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - a.index;
  });

  return scored.map(s => s.item);
}

async function searchA101(query) {
  const base = "https://a101-util.wawlabs.com/combined_api_v2";
  const payload = JSON.stringify({
    query: query,
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
  const products = Array.isArray(data?.products) ? data.products : [];
  const items = rerankItems(filterResults(products, query), query);

  a101AllResults = items;

  if (items.length === 0) {
    a101List.innerHTML = "";
    a101Count.textContent = "0 sonuç";
  } else {
    renderResults(items.slice(0, perStoreLimit), a101List, a101Count, "A101");
  }
}

function normalizeMigrosItem(item) {
  const name = item.name || "";
  const shownPrice = item.shownPrice ?? item.regularPrice ?? 0;
  const priceNum = typeof shownPrice === "number" ? shownPrice / 100 : 0;
  const regularPriceNum =
    typeof item.regularPrice === "number" ? item.regularPrice / 100 : 0;
  const discountRate =
    typeof item.discountRate === "number" ? item.discountRate : 0;

  const imageUrl =
    item.images?.[0]?.urls?.PRODUCT_LIST ||
    item.images?.[0]?.url ||
    "";

  const url =
    item.prettyName && item.prettyName.trim() !== ""
      ? `https://www.migros.com.tr/${item.prettyName}`
      : "#";

  const inStock = item.status === "IN_SALE";

  return {
    name,
    price_str: priceNum > 0 ? priceNum.toFixed(2).replace(".", ",") : "",
    old_price_str:
      regularPriceNum > 0 && regularPriceNum > priceNum
        ? regularPriceNum.toFixed(2).replace(".", ",")
        : "",
    discount: discountRate,
    image_url: imageUrl,
    url,
    attributes: {
      inStock,
      category: item.categoryName || "",
    },
  };
}

async function searchMigros(query) {
  const response = await fetch(`/api/migros?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log("Migros raw response:", data);
  const products = data?.data?.searchInfo?.storeProductInfos || [];

  const filtered = filterResults(products.map(normalizeMigrosItem), query);
  const items = rerankItems(filtered, query);

  migrosAllResults = items;

  if (items.length === 0) {
    migrosList.innerHTML = "";
    migrosCount.textContent = "0 sonuç";
  } else {
    renderResults(items.slice(0, perStoreLimit), migrosList, migrosCount, "Migros");
  }
}

function setPhotoStatus(message) {
  photoStatus.textContent = message;
  photoStatus.style.display = message ? "block" : "none";
}

async function runPhotoSearch(file) {
  if (!file.type.startsWith('image/')) {
    setPhotoStatus('');
    errorText.textContent = 'Lütfen sadece fotoğraf yükleyin (JPG, PNG, WEBP)';
    setView('error');
    return;
  }

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
  const nextLimit = getNextLimit(perStoreLimit);
  perStoreLimit = nextLimit;

  renderResults(a101AllResults.slice(0, perStoreLimit), a101List, a101Count, "A101");
  renderResults(migrosAllResults.slice(0, perStoreLimit), migrosList, migrosCount, "Migros");
  updateLoadMore();
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
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
