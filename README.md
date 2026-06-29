# Fiyatlı

**Snap a photo of a product. Get its live price.**

🔗 Live app: [fiyatli.vercel.app](https://fiyatli.vercel.app/)

## What it does

Fiyatlı removes the "type the product name and search" step from price-checking. The user takes a photo of a product with their phone, and the app:

1. Sends the image to **Groq's vision model** for product identification
2. Queries the **official APIs** of supported stores using the identified product
3. Returns up-to-date prices, side by side, in seconds

No typing, no guessing at brand/model names, no tab-switching between store apps.

## Why this exists

The idea came from a conversation with a friend who'd thought about it 3 years earlier but wasn't sure if reliable, low-cost image-based product recognition was even possible yet. It is now — this is the proof.

## Supported stores

- **A101**
- **Migros**

Scoped to 2 stores on purpose for the MVP — the goal was to prove the core mechanic (photo → product match → live price) works end-to-end before expanding store coverage.

## How it works

```
User photo → Groq Vision (product identification)
                    ↓
        Official store APIs (A101, Migros)
                    ↓
          Live prices returned to user
```

## Tech stack

- **Frontend:** Vanilla JavaScript, HTML, CSS
- **Backend:** Serverless functions (`/api`)
- **Vision/recognition:** Groq vision model
- **Pricing data:** Official A101 and Migros APIs
- **Hosting:** Vercel

## Status

Active MVP — 40+ commits and 28+ releases since initial launch, iterated on real usage rather than a single weekend build.

## Roadmap ideas

- Add more stores
- Handle ambiguous matches (same product, different packaging/angle)
- Price history / drop alerts

---

Built solo, idea-to-deployed in a single day.
