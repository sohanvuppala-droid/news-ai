# Signal Sheet — AI News Board

A static dashboard: a date-grouped feed of AI news, stocks, trending Hugging
Face models, trending arXiv papers, and GitHub activity, with a category
filter and a bookmarking/"Saved" tab.

## How the live data works

`index.html` calls two of its own serverless functions instead of Hugging
Face and arXiv directly:

- `netlify/functions/models.js` → proxies Hugging Face's trending models API
- `netlify/functions/papers.js` → proxies arXiv's API

This matters because neither Hugging Face's nor arXiv's API sends the CORS
headers needed for a browser to call them directly from another domain — the
request gets blocked before it even reaches them. Routing through a
serverless function sidesteps that: the function itself runs on Netlify's
servers, calls the real API server-to-server (where CORS doesn't apply), and
hands your browser clean JSON.

**This means the site needs to be deployed on Netlify specifically** — plain
static hosts like GitHub Pages or Netlify Drop's temporary links don't run
serverless functions, so the live data won't work there. See deploy steps
below.

## Deploy it on Netlify (free)

1. Push this folder to a GitHub repo
2. Go to https://app.netlify.com → **Add new site → Import an existing project**
3. Connect the repo — Netlify auto-detects `netlify.toml` and the
   `netlify/functions` folder, no build settings needed
4. Deploy — you'll get a URL like `your-site.netlify.app`

(Netlify Drop's drag-and-drop upload does **not** run functions — it's static
hosting only. Use the GitHub-connected method above so the functions deploy
too.)

## What's live vs. sample once deployed

| Source                    | Status once deployed on Netlify                          |
|----------------------------|------------------------------------------------------------|
| Models (today)             | Live — via `netlify/functions/models.js`                   |
| Papers (today)              | Live — via `netlify/functions/papers.js`                   |
| News, Stocks, GitHub        | Sample data — these need their own proxy functions plus API keys (see below) |
| Models/Papers (yesterday)   | Sample — trending APIs only return "right now," not history |

## Making News, Stocks, and GitHub live too

Same pattern as Models/Papers — add a function per source:

- **News** — sign up for a free key from an API like NewsAPI, store it as a
  Netlify environment variable, and add `netlify/functions/news.js` that
  calls the news API server-side with that key
- **Stocks** — same idea with a market data API (Alpha Vantage, Finnhub, etc.)
- **GitHub trending** — there's no official "trending repos" API; a function
  here would either scrape the trending page or approximate it via GitHub's
  search API sorted by recent stars

Store any API keys as environment variables in Netlify's site settings
(**Site configuration → Environment variables**) — never hardcode them in
`index.html`, since that file is public.

## Editing

Everything client-side — data, styling, and logic — lives in `index.html`.
The `STOCKS` and `FEED` objects near the top of the `<script>` tag are plain
JS, easy to extend with more dates or companies. Server-side logic lives in
`netlify/functions/`.
