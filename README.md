# Northlight

Local photo studio. Drop portraits, strip watermarks, clean studio backdrops, export print-ready JPGs.

Live: [https://photo.dosa.dev/](https://photo.dosa.dev/) · Agents: [llms.txt](https://photo.dosa.dev/llms.txt)

## Run

```bash
npm install
cp .env.example .env
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

Studio AI calls `https://api.x.ai/v1/images/edits` with `grok-imagine-image-2.0`.
For now, bring your own xAI key: open **Settings** (top right) and paste it. It is
stored AES-256-GCM encrypted in this browser only, sent only with your image
request, and can be removed from the same dialog. Paid credits will use a
separate authenticated path when implemented.

This app does not persist photos. Images you finish are processed per [xAI's privacy policy](https://x.ai/legal/privacy-policy).

## Scripts

```bash
npm run dev        # Vite on 0.0.0.0:8080
npm run build      # production build
npm run typecheck
npm run clerk:check:prod # verify production uses the committed auth policy
npm run cf:check   # Cloudflare production build + deploy dry run
npm run deploy     # deploy the photo-app Worker
```

## Cloudflare deployment

The production app runs as the `photo-app` Cloudflare Worker. The custom domain
`photo.dosa.dev` is attached to that Worker in Cloudflare.

Install the Clerk CLI and authenticate it before using the deployment scripts:

```bash
npm install -g clerk
clerk auth login
```

```bash
npm install
npm run cf:check
npm run deploy
```

The Worker requires both Clerk variables at runtime. Configure
`VITE_CLERK_PUBLISHABLE_KEY` as a Cloudflare build variable and Worker secret,
and configure `CLERK_SECRET_KEY` as a Worker secret. Never commit either value.

The desired production authentication policy is versioned in
`clerk.production.json`. Preview, apply, and verify it with:

```bash
clerk config patch --app app_3J0Xwvy7J3M2EM3uq1M0aaudEFq --instance prod --file clerk.production.json --dry-run
clerk config patch --app app_3J0Xwvy7J3M2EM3uq1M0aaudEFq --instance prod --file clerk.production.json --yes
npm run clerk:check:prod
```

The app keeps source and finished photos in request/browser memory only; it has
no image-storage binding. Production does not accept a deployment-wide xAI key:
anonymous use remains BYOK until paid credits have an authenticated entitlement
and atomic debit path.
