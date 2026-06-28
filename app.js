const TEXT_ENDPOINT = "/api/search";

const form = document.getElementById("text-search-form");
const queryInput = document.getElementById("query");
const photoInput = document.getElementById("photo-input");
const previewContainer = document.getElementById("preview-container");
const preview = document.getElementById("preview");
const clearPhotoBtn = document.getElementById("clear-photo");
const statusEl = document.getElementById("search-status");
const resultsSection = document.getElementById("results");
const resultsList = document.getElementById("results-list");
const noResultsSection = document.getElementById("no-results");
const errorBox = document.getElementById("error-box");
const errorText = document.getElementById("error-text");

let currentFile = null;

function show(section) {
  [resultsSection, noResultsSection, errorBox].forEach((el) => {
    el.style.display = "none";
  });
  section.style.display = "";
}

function setStatus(message) {
  statusEl.textContent = message;
  statusEl.style.display = message ? "block" : "none";
}

function renderResults(items) {
  resultsList.innerHTML = "";
  items.forEach((item) => {
    const a = document.createElement("a");
    a.className = "result-item";
    a.href = item.url || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const img = document.createElement("img");
    img.className = "result-image";
    img.src = item.image || "";
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
    name.textContent = item.name || "";

    const price = document.createElement("p");
    price.className = "result-price";
    price.textContent = item.price
      ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
          Number.parseFloat(item.price.replace(/\./g, "").replace(",", "."))
        )
      : "";

    body.appendChild(name);
    body.appendChild(price);
    a.appendChild(img);
    a.appendChild(body);
    resultsList.appendChild(a);
  });
}

async function searchText(query) {
  setStatus("Aranıyor…");
  resultsSection.style.display = "none";

  try {
    const response = await fetch(TEXT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data?.results) ? data.results : [];
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
  } finally {
    setStatus("");
  }
}

async function searchPhoto(file) {
  setStatus("Fotoğraf tanınıyor…");
  resultsSection.style.display = "none";

  try {
    const worker = await Tesseract.createWorker("tur", 1, {
      langPath: "https://cdn.jsdelivr.net/npm/tesseract.js@v2.1.0/lib/tessdata/",
    });
    const { data } = await worker.recognize(file);
    const text = (data.text || "").trim();
    await worker.terminate();

    if (!text) {
      errorText.textContent = "Fotoğraftan metin okunamadı. Daha net bir fotoğraf deneyin.";
      show(errorBox);
      setStatus("");
      return;
    }

    await searchText(text);
  } catch (err) {
    console.error("OCR error:", err);
    errorText.textContent = "Fotoğraf ile arama başarısız oldu. Lütfen tekrar deneyin.";
    show(errorBox);
    setStatus("");
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = queryInput.value.trim();
  if (!q) return;
  searchText(q);
});

photoInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  currentFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.src = ev.target.result;
    previewContainer.classList.remove("hidden");
  };
  reader.readAsDataURL(file);

  if (typeof Tesseract !== "undefined") {
    searchPhoto(file);
  } else {
    errorText.textContent =
      "Fotoğraf tanıyıcı yüklenemedi. Lütfen sayfayı yenileyin.";
    show(errorBox);
  }
});

clearPhotoBtn.addEventListener("click", () => {
  photoInput.value = "";
  currentFile = null;
  preview.src = "";
  previewContainer.classList.add("hidden");
});
