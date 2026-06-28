# Fiyatlı

A101 ürün fiyatlarını metin veya fotoğraf ile saniyelerde sorgula.

## Demo

> Deploy your own on Vercel.

## Features

- **Text Search** — Ürün adını yaz, anında fiyatı gör
- **Photo Search** — Fotoğraf yükle, ürünü tanı, fiyatı bul
- **Clean UI** — Minimal, hızlı, mobil uyumlu

## Tech Stack

- Frontend: plain HTML/CSS/JS
- Backend: Vercel Serverless Functions
- Search API: a101-ecom.wawlabs.com
- OCR: Tesseract.js

## Local Development

```bash
npm i -g vercel
vercel dev
```

Open http://localhost:3000

## Deploy

```bash
vercel --prod
```

## Versioning

- `v1.0.0` – MVP: text search + photo search (OCR) + results page
- Next minor bump: `v1.2.0`, `v1.4.0`, ...

## License

MIT
