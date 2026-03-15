# ClarityPro — Organic CRO Analytics Dashboard

Track organic visitor conversion rates using Microsoft Clarity data, analyzed by Claude AI.

## Tech Stack

- **Next.js 16** (App Router, Edge Runtime)
- **Tailwind CSS v4**
- **Recharts** for data visualization
- **lucide-react** for icons
- **Anthropic Claude API** for AI-powered analytics

## Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- (Optional) A Microsoft Clarity project with a JWT export token

## Setup

```bash
git clone https://github.com/bluejaypro/CRO-Optimizer.git
cd CRO-Optimizer
npm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Connecting Microsoft Clarity

1. Click the **Settings** gear icon in the sidebar
2. Paste your Clarity Live Insights JWT token
3. Click **Save & Reload** — the dashboard will fetch real analytics data

Without a Clarity token, the dashboard displays demo data.

## Architecture

```
src/
  app/
    page.js              # Main dashboard (client component)
    layout.js            # Root layout
    globals.css          # Tailwind + custom styles
    dashboard.css        # Dashboard-specific styles
    api/
      anthropic/v1/
        messages/
          route.js       # Claude API proxy (Edge Runtime)
```

- **`/`** — Single-page dashboard with domain list, CRO metrics, charts, and AI analysis
- **`/api/anthropic/v1/messages`** — Server-side proxy to the Anthropic API (keeps your API key secret)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
