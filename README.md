# Northlight

Local photo studio. Drop portraits, strip watermarks, clean studio backdrops, export print-ready JPGs.

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
   - **Proof clean** — watermarks off, grey yearbook backdrop
   - **Watermarks only** — logos/text off, keep the original background
   - **HQ enhance** — color, light, sharpness
   - **Studio grey / white** — seamless paper backdrop
   - **Custom** — your instructions, identity locked
3. Press **Finish photo**. Drag the slider to compare. Hold **Space** for the original.
4. Download **HQ** or **Print JPG** (2×).

Studio AI calls `https://api.x.ai/v1/images/edits` with `grok-imagine-image-2.0`. Set `XAI_API_KEY` in `.env`. Without a key, add one in **Settings**.

You can also bring your own key in the app: open **Settings** (top right) and paste it. It is stored AES-256-GCM encrypted in this browser only, takes precedence over the server key, and can be removed again from the same dialog.

This app does not persist photos. Images you finish are processed per [xAI's privacy policy](https://x.ai/legal/privacy-policy).

## Scripts

```bash
npm run dev        # Vite on 0.0.0.0:8080
npm run build      # production build
npm run typecheck
```
