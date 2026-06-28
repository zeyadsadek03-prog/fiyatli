"use client"

import { useState, useRef, useEffect } from "react"
import { TextRotate } from "@/components/ui/text-rotate"

type Product = {
  name: string
  price_str?: string
  discounted_price?: number | null
  discounted_price_str?: string | null
  image_url?: string
  url?: string
  attributes?: {
    url?: string
    image_url?: string
    imageUrl?: string
    price_str?: string
    name?: string
  }
}

export default function Home() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Product[]>([])
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState("")
  const [noResults, setNoResults] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayedItems = showAll ? items : items.slice(0, 3)

  function formatPrice(raw: string | undefined) {
    if (!raw) return ""
    const normalized = raw.replace(/\./g, "").replace(",", ".")
    const num = Number.parseFloat(normalized)
    if (Number.isNaN(num)) return raw
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(num)
  }

  function filterByBrand(products: Product[], q: string) {
    const words = q
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .split(" ")
      .filter((w) => w.length > 2)

    const brand = words[0] || q.toLowerCase()
    if (!brand) return products

    return products.filter((p) => {
      const name = (p.name || p.attributes?.name || "")
        .toLowerCase()
        .replace(/ı/g, "i")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ğ/g, "g")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
      return name.includes(brand)
    })
  }

  async function searchText(q: string) {
    setLoading(true)
    setError("")
    setNoResults(false)
    setItems([])
    setShowAll(false)

    try {
      const base = "https://a101-util.wawlabs.com/combined_api_v2"
      const payload = JSON.stringify({
        query: q,
        filter: [],
        sort: [],
        page_number: 1,
        row_per_page: 20,
      })
      const url = `${base}?&q=${encodeURIComponent(q)}&location=VS032-SLOT&json_data=${encodeURIComponent(payload)}`

      const response = await fetch(url, {
        mode: "cors",
        headers: {
          Referer: "https://www.a101.com.tr",
          Origin: "https://www.a101.com.tr",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      // The API returns an object with products array, but let's be safe
      let products: Product[] = []
      const maybeProducts = (data as any)?.products
      if (Array.isArray(maybeProducts)) {
        products = maybeProducts
      } else if (Array.isArray(data)) {
        products = data
      }

      const filtered = filterByBrand(products, q)
      setItems(filtered)
      if (filtered.length === 0) {
        setNoResults(true)
      }
    } catch (err) {
      console.error(err)
      setError("Arama başarısız oldu. Lütfen tekrar deneyin.")
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    searchText(q)
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError("")
    setNoResults(false)
    setItems([])

    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const groqRes = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      })

      if (!groqRes.ok) {
        const errText = await groqRes.text()
        throw new Error(`Vision API ${groqRes.status}: ${errText}`)
      }

      const groqData = await groqRes.json()
      const cleaned = (groqData.text || "").trim()
      if (!cleaned) {
        setError("Ürün okunamadı, lütfen daha net bir fotoğraf deneyin.")
      } else {
        setQuery(cleaned)
        await searchText(cleaned)
      }
    } catch (err) {
      console.error("Photo search error:", err)
      setError("Fotoğraf ile arama başarısız oldu.")
    } finally {
      setLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(""), 5000)
    return () => clearTimeout(timer)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4 sm:p-8">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
            Fiyatlı
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            A101 ürün fiyatlarını saniyelerde{" "}
            <span className="inline-block align-bottom">
              <TextRotate
                texts={["Ucuz fiyatlar ✓", "Hızlı arama ✓", "A101 fiyatları ✓"]}
                rotationInterval={2500}
                staggerDuration={0.03}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-120%", opacity: 0 }}
                mainClassName="text-emerald-600 dark:text-emerald-400 font-bold"
                splitLevelClassName="overflow-hidden"
                elementLevelClassName="inline-block"
              />
            </span>
          </p>
        </header>

        <main>
          <form onSubmit={onSubmit} className="flex gap-2 mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün adı gir (örn: süt, ekmek, domates)..."
              className="flex-1 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              required
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white px-5 py-3 text-sm font-semibold"
            >
              {loading ? "..." : "Ara"}
            </button>
          </form>

          <div className="mb-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium hover:border-emerald-500 disabled:opacity-70"
            >
              📷 Fotoğraf ile ara
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoChange}
            />
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          {noResults && !error && (
            <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-100 p-4 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              Bu ürün A101&apos;de bulunamadı 🚫
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-3">
              <div className="grid gap-3">
                {displayedItems.map((item, idx) => {
                  const href =
                    item.url ||
                    item.attributes?.url ||
                    `https://www.a101.com.tr/arama?q=${encodeURIComponent(item.name || "")}`

                  const imgSrc =
                    item.image_url ||
                    item.attributes?.image_url ||
                    item.attributes?.imageUrl ||
                    ""

                  const hasDiscount = item.discounted_price && item.discounted_price > 0
                  const priceStr = item.price_str || item.attributes?.price_str || ""
                  const discountStr =
                    item.discounted_price_str ||
                    (hasDiscount
                      ? new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        }).format(item.discounted_price!)
                      : "")

                  return (
                    <a
                      key={idx}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm hover:shadow-md transition dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.name || ""}
                          className="h-16 w-16 rounded-xl object-contain bg-zinc-50 dark:bg-zinc-800"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                          Resim Yok
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {item.name || item.attributes?.name || "Ürün"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {hasDiscount ? (
                            <>
                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                {discountStr}
                              </span>
                              <span className="text-xs text-zinc-400 line-through">
                                {formatPrice(priceStr)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {formatPrice(priceStr)}
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>

              {items.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white py-3 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  {showAll ? "Daha az göster" : "Daha fazla göster"}
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Yükleniyor...
            </div>
          )}
        </main>

        <footer className="mt-12 text-center text-xs text-zinc-400 dark:text-zinc-500 pb-8">
          Fiyatlı · Veriler a101.com.tr&apos;den çekilir
        </footer>
      </div>
    </div>
  )
}
