# Ye-Ai — THE ATELIER

AI fashion judge. Point your camera, capture your fit, and get an AI-powered style verdict with color analysis and suggestions. Includes an AR try-on mode with real-time body tracking.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS 4, deployed on Vercel (PWA)
- **Database:** Neon (Postgres), accessed through `/api` serverless functions
- **AI:** Google Gemini (outfit analysis), Lykdat (clothing detection), MediaPipe Holistic (body tracking), Three.js (3D garments)
- **ML backend (local dev only):** FastAPI + Kornia TPS garment warping — see `ml-backend/README.md`

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    Copy .env.example to .env and fill in the values
#    (DATABASE_URL, GEMINI_API_KEY, LYKDAT_API_KEY, BLOB_READ_WRITE_TOKEN;
#     optional: VITE_SENTRY_DSN for error tracking)

# 3. Run the dev server
npm run dev        # frontend only (API calls will fail)
npx vercel dev     # frontend + /api serverless functions together
```

For production, set the same four environment variables in
Vercel → Project → Settings → Environment Variables.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

## Notes

- Database setup scripts live in `db/` (gitignored — private).
- Never commit `.env` — secrets go in Vercel env vars for production.
