# Northlight

Local photo studio. Drop portraits, strip watermarks, clean studio backdrops, export print-ready JPGs.

Live: [https://photo.dosa.dev/](https://photo.dosa.dev/) · Agents: [llms.txt](https://photo.dosa.dev/llms.txt)

## Run

```bash
npm install
cp .env.example .env
# Put your xAI API key in .env if you want Studio AI
npm run dev
```

Open the printed local URL. Default port is **8080**.

## How to use

1. Drop, paste, or choose JPEG / PNG / WebP photos (up to 12).
2. Pick a finish:
   - **Proof clean**: watermarks off, grey yearbook backdrop
   - **Watermarks only**: logos/text off, keep the original background
   - **HQ enhance**: color, light, sharpness
   - **Cleanup**: glasses glare, flyaways, lint, wrinkles
   - **Studio grey / white**: seamless paper backdrop
   - **ID photo**: passport-style, white backdrop, 3:4
   - **LinkedIn**: square studio headshot
   - **Custom**: your instructions, identity locked
3. Optional: lock **crop** (Auto / 1:1 / 3:4 / 2:3), switch **B&W**, or turn on **gentle retouch**.
4. Optional: pin a finished photo as the **look** (lighting and grade for the rest of the batch), or drop a studio-paper photo as the **backdrop**.
5. Press **Finish photo**. Drag the slider to compare. Hold **Space** for the original.
6. Download **HQ** or **Print JPG** (2×).

Studio AI calls `https://api.x.ai/v1/images/edits` with `grok-imagine-image-2.0`. Set `XAI_API_KEY` in `.env`. Without a key, add one in **Settings**.

You can also bring your own key in the app: open **Settings** (top right) and paste it. It is stored AES-256-GCM encrypted in this browser only, takes precedence over the server key, and can be removed again from the same dialog.

This app does not persist photos. Images you finish are processed per [xAI's privacy policy](https://x.ai/legal/privacy-policy).

## Scripts

```bash
npm run dev        # Vite on 0.0.0.0:8080
npm run build      # production build
npm run typecheck
npm run cf:check   # Cloudflare production build + deploy dry run
npm run deploy     # deploy the photo-app Worker
```

## Cloudflare deployment

The production app runs as the `photo-app` Cloudflare Worker. The custom domain
`photo.dosa.dev` is attached to that Worker in Cloudflare.

```bash
npm install
npm run cf:check
npm run deploy
```

Set `XAI_API_KEY` as a Worker secret if the deployment should provide Studio AI
without requiring a browser-supplied key:

```bash
npx wrangler secret put XAI_API_KEY
```

Do not put the key in `wrangler.jsonc`. The app keeps source and finished photos
in request/browser memory only; it has no image-storage binding.
