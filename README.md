# Cite. — Free Citation Generator

A 100% free citation generator — paste a URL or upload a PDF, get perfectly formatted citations in APA, MLA, Chicago, IEEE, and Harvard. **No AI, no API keys, no cost.**

## Features

- **Paste any URL** — articles, journals, news sites, blogs — and get a complete citation
- **Upload PDFs** — extracts DOI from the document, fetches full metadata from CrossRef
- **5 citation styles**: APA 7th, MLA 9th, Chicago 18th, IEEE, Harvard
- **Smart DOI detection** — automatically identifies DOIs in URLs for precise metadata
- **CrossRef integration** — fetches complete metadata (authors, journal, volume, issue, pages, dates) from the free CrossRef API
- **HTML meta tag parsing** — extracts metadata from web page `<meta>` tags as a fallback
- **Folder organization** — create folders for different classes or projects
- **Instant style switching** — convert any citation between styles with one click
- **Formatted clipboard** — copies with proper italics for Word/Google Docs
- **Export** — download all citations as a `.txt` file
- **Persistent storage** — saved in localStorage, works offline after first load

## How It Works

1. **For URLs with DOIs**: Fetches complete metadata from the [CrossRef API](https://www.crossref.org/documentation/retrieve-metadata/) (free, public, no key needed)
2. **For other URLs**: Fetches the page HTML via CORS proxy, parses `<meta>` tags (og:title, citation_author, citation_date, etc.), and if a DOI is found, also fetches CrossRef data
3. **For PDFs**: Extracts text using [PDF.js](https://mozilla.github.io/pdf.js/), finds the DOI, fetches complete metadata from CrossRef
4. **Formatting**: All citation formatting is done locally with custom rules for each style

## Tech Stack

- **React 18** + **Vite**
- **CrossRef API** — free metadata for any DOI
- **PDF.js** — client-side PDF text extraction
- **No backend** — runs entirely in the browser

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/cite-app.git
cd cite-app
npm install
npm run dev
```

Open `http://localhost:5173`. No API keys to configure.

## Deploy (free)

**Vercel** (30 seconds): Push to GitHub → vercel.com → New Project → Import → Deploy

**Netlify**: Push to GitHub → netlify.com → Add site → Import → Build command `npm run build`, publish dir `dist`

## License

MIT
