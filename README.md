# Ash Trade Journal

A **local-first trading journal** for recording trades, reviewing performance honestly, and sharing beautiful recap cards. Built with Next.js, TypeScript, Prisma (SQLite), Tailwind CSS v4, and shadcn/ui.

All data lives in a local SQLite file — no accounts, no cloud sync, no telemetry. You run it, it's yours.

![Dark-first design: deep midnight surfaces, indigo primary, emerald/rose for P&L]

---

## Features

- **Dashboard** — headline metrics (Net P&L, Total R, Win Rate, Profit Factor, Trade Count), equity curve, Today / This Week / This Month performance cards with per-day R charts.
- **Journal** — filterable trade table (search + symbol, strategy, session, result filters), quick add, and a detailed trade page.
- **Trade form** — records entry/exit, stop loss, take profit, risk, R multiple, session, timeframe, market condition, emotion, mistake, confidence, notes, and a structured **trading plan**.
  - Narrative timeframe + CISD + confluence are **auto-composed** into the trade's `strategy` field on save (e.g. `Breakout · Daily · M5 · SMT`).
- **Recap & Share cards** — turn a day/week/month of performance into shareable images:
  - Landscape `1440×1080` or portrait `1080×1440`, customizable headline metric and metric tiles.
  - Copy to clipboard or download as PNG (via `html-to-image`).
  - Every trade has a public share page at `/trade-share/{id}`.
- **Analytics** — R distribution and per-day P&L across periods, win/loss breakdown.
- **Calendar** — heatmap view of daily R for any month.
- **Accounts** — multiple trading accounts (prop firm / broker / personal / demo / challenge / funded) with balances; archive/delete. Prop-related accounts (`PROP_FIRM`, `CHALLENGE`, `FUNDED`) can set a **target profit (%)** and show a progress bar toward it on their card.
- **Settings** — light/dark appearance, data management (export/clear).
- **Local-first storage** — everything in `prisma/dev.db`; uploaded images in `public/uploads/`.

## Tech Stack

| Layer    | Choice                                              |
| -------- | --------------------------------------------------- |
| Framework| Next.js 16 (App Router, Turbopack)                   |
| Language | TypeScript                                           |
| UI       | Tailwind CSS v4, shadcn/ui (base-ui), lucide-react   |
| Charts   | Recharts                                            |
| ORM      | Prisma 6 (SQLite)                                    |
| Forms    | Server Actions + Zod                                 |
| Export   | `html-to-image` (PNG share cards)                    |
| Fonts    | Poppins (UI) + Geist Mono (numeric data)             |

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & run

```bash
npm install

# 2. Configure the database path
cp .env.example .env        # DATABASE_URL="file:./dev.db"

# 3. Create the database + generate the Prisma client
npx prisma migrate dev

# 4. (Optional) seed demo accounts + ~200 realistic trades
npm run seed

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000.

> **Note for new installs:** if `prisma migrate` has no migration files yet, run:
> ```bash
> npx prisma db push && npx prisma generate
> ```

### Scripts

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start dev server (Turbopack)             |
| `npm run build`        | Production build                         |
| `npm start`            | Run production server                    |
| `npm run lint`         | ESLint                                   |
| `npm run seed`         | Seed demo data (`tsx prisma/seed.ts`)    |

### Environment variables

| Variable        | Required | Default        | Description                |
| --------------- | -------- | -------------- | -------------------------- |
| `DATABASE_URL`  | ✅       | `file:./dev.db`| SQLite database file path  |

See `.env.example`.

## Project Structure

```
prisma/
  schema.prisma     # Data model
  seed.ts           # Reproducible demo-data seeder
public/uploads/     # Uploaded trade screenshots (git-ignored)
src/
  app/
    page.tsx                    # Dashboard (/) 
    journal/page.tsx            # Trade journal table
    journal/[id]/page.tsx       # Trade detail
    analytics/page.tsx          # Analytics
    calendar/page.tsx           # Calendar heatmap
    accounts/page.tsx           # Account management
    settings/page.tsx           # Appearance + data management
    recap/page.tsx              # Build a shareable recap card
    trade-share/[id]/page.tsx   # Public per-trade share card
    api/trades/[id]/route.ts    # JSON API for a single trade
    actions/                    # Server Actions (trades, accounts, share)
    globals.css                 # Tailwind v4 theme tokens
  components/
    app/          # Shell: sidebar, header, nav, account selector, theme toggle
    dashboard/    # Metric cards, performance cards, charts
    journal/      # Trade form, table, toolbar, form context
    recap/        # Recap canvas (share card renderer)
    settings/     # Settings panels
    ui/           # shadcn/ui primitives + PageHeader
  lib/
    db.ts                 # Prisma client singleton
    data.ts               # Server-side data access + DTOs
    calculations/metrics.ts  # R, win rate, PF, equity curve, aggregation
    dates.ts              # Date/week/month utilities
    formatters.ts         # Currency / R / percent / date formatting
    constants.ts          # Recap formats, headline options, CISD timeframes
    validation.ts         # Zod schemas for server actions
```

## Data Model

```prisma
enum Direction { LONG, SHORT }
enum TradeResult { WIN, LOSS, BREAKEVEN }
enum AccountType { PROP_FIRM, BROKER, PERSONAL, DEMO, CHALLENGE, FUNDED }
enum AccountStatus { ACTIVE, ARCHIVED }
enum ImageType { BEFORE, AFTER, RESULT_SHARING }
enum RecapType { DAILY, WEEKLY, MONTHLY, CUSTOM }

model TradingAccount {
  id             String          @id @default(cuid())
  name           String
  provider       String?
  type           AccountType     @default(BROKER)
  initialBalance Float           @default(0)
  currentBalance Float           @default(0)
  currency       String          @default("USD")
  status         AccountStatus   @default(ACTIVE)
  isDefault      Boolean         @default(false)
  trades         Trade[]
  recaps         SharedRecap[]
}

model Trade {
  id              String      @id @default(cuid())
  accountId       String
  symbol          String
  direction       Direction
  entryPrice      Float
  exitPrice      Float?    // null until trade closes
  stopLoss        Float?
  takeProfit      Float?
  riskAmount      Float?   // money risked
  riskPercent     Float?   // % of account risked
  rr              Float?   // planned reward:risk
  rMultiple       Float?   // realized R multiple
  pnl             Float?   // realized P&L
  result          TradeResult
  strategy        String?  // auto-composed + editable
  setup           String?
  session         String?
  timeframe       String?
  marketCondition String?
  emotion         String?
  mistake         String?
  confidence      Int?
  notes           String?
  tradePlan       String?
  openedAt        DateTime
  closedAt        DateTime
  images          TradeImage[]
}

model TradeImage  { id, tradeId, url, type }
model SharedRecap { id, accountId?, periodType, startDate, endDate, template, format, createdAt }
```

Key conventions:

- **R multiple** = realized P&L / risk amount. It lets you compare performance regardless of account size.
- **Win rate**, **profit factor** (gross profit ÷ gross loss), **expectancy**, and **max drawdown** are computed from journaled trades in `src/lib/calculations/metrics.ts`.
- Green (`emerald`) = positive/win, red (`rose`) = negative/loss throughout the app and share cards.

## Pages & Flows

### Dashboard `/`
Account-scoped headline metrics + equity curve + today/week/month performance. Use the `?account=` and `?month=` URL params (the month chips on the Month card navigate through calendar months).

### Journal `/journal` and `/journal/[id]`
Filterable table (search + result/session/symbol/strategy filters); clicking a row opens the trade detail page with edit, share, and delete actions, plus before/after screenshot uploads.

### Recap `/recap`
Pick day/week/month, account, orientation (landscape `1440×1080` → portrait `1080×1440`), headline metric, and which metric tiles to show — then **Copy** or **Download PNG**. The recap card shows the branded badge "ASH TRADE JOURNAL".

### Trade share `/trade-share/[id]`
A self-contained share card per trade showing symbol, direction, headline R, entry/exit, stop loss/take profit, R:R, session, trading plan, and notes. Exposed as a plain JSON API too: `GET /api/trades/{id}`.

### Settings `/settings`
Dark/light theme, plus data management (clear all / manage your local data).

## Trade Form — Trading Plan & Strategy Auto-compose

The form's **Trading Plan** section captures the narrative setup:

- Narrative timeframe (`DAILY / H4 / H1 NARRATIVE`)
- Higher-timeframe / lower-timeframe context and **CISD** (smart-money displacement/continuation)
- Confluence notes

On save, `Ash Trade Journal` composes your `strategy` like:

```
Breakout · Daily · M5 · SMT
```

(active strategy · narrative timeframe · its CISD · confluence tokens). It strips a previously composed narrative tail first, so saving edits doesn't append duplicates.

## Design System

- **Dark-first** "midnight" theme (default): deep navy-black surfaces, indigo primary, emerald/rose semantics, crisp low-alpha borders, precise `12px` radius.
- Poppins for UI copy; **Geist Mono** for every numeric value (metric figures, tables, calendar cells, chart labels, share-card headlines) via a global `tabular-nums → mono` rule — keeping numbers aligned and technical.
- Light mode mirrors the same token structure.

## Deployment

```bash
npm run build
npm start        # production server on :3000
```

Because the app is local-first, deployment runtime needs a writable location for:
- `prisma/dev.db` — the SQLite database
- `public/uploads/` — trade screenshots

On a platform like Vercel/Railway, put the DB on persistent storage and initialize it with `npx prisma db push` before first boot. Do **not** commit `*.db` or `public/uploads/` (both are git-ignored).

## FAQ / Troubleshooting

- **Hydration warnings about `bis_skin_checked` attributes?** Those come from a DOM-inspecting browser extension mutating the HTML before React hydrates — not from the app. Open the site in incognito or disable the extension.
- **`prisma` CLI complains about `provider = sqlite` not being a string literal?** Some `prisma db execute` subcommands fail validation with older CLI versions. Use `npx prisma db push` or `npx prisma migrate dev` instead — the app itself runs fine.
- **Where is my data?** `prisma/dev.db` (SQLite) + `public/uploads/` for images. Back up those two paths.

---

Built with a local-first mindset: fast, private, and honest about your trading.