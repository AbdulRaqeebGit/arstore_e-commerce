# ARstore — White & Black Marketplace

A professional, responsive marketplace with a **white background + black elements** design,
**Bootstrap 5 + Bootstrap Icons**, **real product photos**, **animations**, **Supabase storage**,
and **AI image generation**. Vanilla JS — no build step.

## Features

- **Auth** — signup (customer/seller), login, forgot-password, logout.
- **Settings** — change **username**, phone, city; change password; **switch account type**
  (Customer ⇄ Seller) with **only the password** (same email).
- **Three dashboards**
  - 👑 **Admin** — delete users & products, animated stats.
  - 🛍️ **Customer** — search, price/category filters, sort, buy.
  - 🏪 **Seller** — upload products + **AI image generation** + AI text helper.
- **Product page** — big photo, **Buy now**, reviews with **star ratings**.
- **📷 Lens** — upload a photo → visually similar products.
- **✦ AI Assistant** — floating chat for customers.
- **💾 Storage** — Supabase (primary) → local server (`data.json`) → localStorage.
- **🖼️ Images** — uploaded photos are saved on the server under `/uploads/` and the returned
  URL is stored (not local base64).
- **✨ UI** — vector icons everywhere, page transitions, staggered cards, hover lifts,
  shimmer, reveal-on-scroll, animated counters, skeleton loading, reduced-motion support.

## Run it

```bash
node server.js
# open http://localhost:3000
```

> Products are **not** pre-filled. The shop shows only what sellers upload — that's why a
> fresh shop says "No products yet". Log in as a seller and add products.

## Demo accounts

| Role     | Email                           | Password       |
|----------|---------------------------------|----------------|
| Admin    | abdulraqeebkumhar7000@gmail.com | RaqEEb@7OO     |
| Seller   | seller@demo.com                 | seller123      |
| Seller   | tech@demo.com                   | seller123      |
| Seller   | style@demo.com                  | seller123      |
| Customer | customer@demo.com               | customer123    |

## Supabase

Tables are created (schema in [`supabase-schema.sql`](supabase-schema.sql)). The footer shows
**☁ Supabase connected** when the app is reading/writing Supabase. Demo products were cleared
so the shop starts empty.

## Configuration — `js/config.js`

| Setting | Notes |
|---------|-------|
| `seedDemoProducts` | `false` — shop starts empty. Set `true` to re-add the 24 samples. |
| Supabase | URL + publishable key set. |
| Cloudinary | `cloudName` set; add an unsigned `uploadPreset` to use Cloudinary instead of server uploads. |
| Gemini AI | Needs a valid `AIza...` key for AI text; otherwise local writer. |
| Maps | Removed (map feature was dropped). |

## Known limitations

- **Gemini key** is not a valid `AIza...` API key → AI text uses the local fallback.
- **Cloudinary** has no upload preset → images are hosted by our Node server (`/uploads/`).
- **Auth is demo-grade** (local hashing, reset code on screen, no email verification).
- **Payments are simulated** (Cash on Delivery).
- **AI images** use Pollinations (free, internet required, quality varies).

## Structure

```
index.html            shell + Bootstrap + Bootstrap Icons + fonts
styles.css            white/black theme + animations
js/config.js          credentials & settings
js/supabase.js        Supabase REST client
js/store.js           data layer + sync (Supabase → server → local)
js/auth.js            auth + profile + account-type switch
js/ai.js              Gemini text + local fallback
js/imagegen.js        AI product image generation
js/lens.js            visual search
js/cloud.js           image upload (server → Cloudinary → local)
js/views.js           all screens (Bootstrap markup + icons)
js/ui.js              Lens modal + AI chat
js/app.js             router, topbar, skeleton, reveal, counters
sw.js                 offline service worker (network-first)
server.js             static server + /api/data + /api/upload
supabase-schema.sql   Supabase tables
```
