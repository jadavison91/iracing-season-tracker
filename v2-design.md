# V2 Redesign — Design Specification

## Aesthetic: "Pitwall"

Named for the race engineer's station where telemetry feeds are watched in real time. The UI is a premium, purpose-built performance instrument — not a generic SaaS dashboard.

**The single most memorable thing**: Electric lime (`#C5F131`) on near-black backgrounds. Unusual in racing UIs, immediately legible, gender-neutral. Premium without being intimidating.

---

## Color Palette (dark-first)

```css
--v2-bg: #09090e; /* near-black with cool blue tint */
--v2-surface: #111219; /* card surfaces */
--v2-surface-2: #1a1c26; /* elevated/hover surfaces */
--v2-border: rgba(255, 255, 255, 0.07);
--v2-border-hi: rgba(255, 255, 255, 0.14);
--v2-accent: #c5f131; /* electric lime */
--v2-accent-dim: #8ab020; /* muted accent */
--v2-text: #f4f4f5; /* near-white primary text */
--v2-text-muted: #71717a; /* secondary text */
--v2-text-dim: #3f3f46; /* subtle/disabled text */
--v2-positive: #4ade80; /* wins/gains */
--v2-negative: #f87171; /* losses/incidents */
--v2-warning: #fbbf24; /* podiums */
```

## Typography

- **Display**: [Syne](https://fonts.google.com/specimen/Syne) — geometric, boldly weighted, originally designed for cultural institutions. Not a racing cliché.
- **Mono**: [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — all data values (iRating numbers, lap times, positions). Precision instrument readout aesthetic.
- **Body**: Syne Regular/Medium — one family, two weights.

## Motion

- Subtle staggered fade-in on page load (60ms delay per section)
- Recharts built-in line draw animation on chart mount
- Hover: surface elevation (`--v2-surface` → `--v2-surface-2`) + border brightness
- Active/selected: thin `--v2-accent` left border or underline

---

## Site Map

All new pages live at `/v2/*`. Every existing route and API endpoint is untouched.

| Route                   | Page Name    | Replaces           |
| ----------------------- | ------------ | ------------------ |
| `/v2`                   | Season HQ    | Dashboard + Charts |
| `/v2/races`             | Race Log     | Races              |
| `/v2/series/[seriesId]` | Series Focus | Series Detail      |
| `/v2/rivals`            | Rivals       | Opponents          |

No separate `/v2/charts` page — analytics are embedded where contextually relevant.

---

## Layout System

### Shell

**Desktop (≥1024px)**: Fixed left rail, 220px wide

```
┌──────────────┬──────────────────────────────────────────┐
│  [logo]      │                                          │
│  [driver]    │           page content                   │
│              │                                          │
│  Season HQ   │                                          │
│  Races       │                                          │
│  Rivals      │                                          │
│              │                                          │
│  ──────────  │                                          │
│  [settings]  │                                          │
│  [theme]     │                                          │
│  [driver ▾]  │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Mobile (<1024px)**: Full-width content, sticky bottom tab bar with 4 icons (Season HQ, Races, Series, Rivals). No hamburger menu.

---

## Page Designs

### `/v2` — Season HQ

The entire season story on one page. No clicking to find the narrative.

```
┌─────────────────────────────────────────────────────────┐
│  DRIVER HERO                                            │
│  [Driver Name] — Syne 48–64px                          │
│  [license badge row]    [iRating: 3,204]               │
│  [full-width iRating history chart — hero height]      │
│  [races] [wins] [podiums] [avg inc] [iR delta] [SoF]  │
│                                                         │
│  SERIES THIS SEASON                                     │
│  Each series as a horizontal row:                       │
│  [• Road]  Fanatec GT3   [sparkline]  347pts  2W  4P  →│
│  [• Oval]  NASCAR Cup    [sparkline]  201pts  0W  1P  →│
│                                                         │
│  RECENT RACES                                           │
│  Last 5 races as horizontal cards:                      │
│  [ P1 ]  Spa-Francorchamps  Fanatec GT3  +86 iR  0inc  │
│  [ P3 ]  Watkins Glen        IMSA        +24 iR  2inc  │
└─────────────────────────────────────────────────────────┘
```

- iRating chart is the **hero**, not buried on a separate page
- Series rows have inline sparklines (finish position trend, ~100px wide)
- Recent races visible without navigating away
- Finish position numbers: JetBrains Mono, color-coded (lime P1, white P2–5, muted below)

---

### `/v2/races` — Race Log

Timeline layout, filters as a left rail instead of a top toolbar.

```
┌─────────────────────────────────────────────────────────┐
│  [6 stat chips: races / wins / podiums / inc / iR / SoF]│
│  [incident sparkline — inline, small]                   │
├──────────────┬──────────────────────────────────────────┤
│  Discipline  │  ── Apr 2025 ──────────────────────      │
│  ○ All       │  ┌─────────────────────────────────────┐ │
│  ○ Road      │  │ P3  Spa-Francorchamps  Fanatec GT3  │ │
│  ○ Oval      │  │     +24 iR  ·  2 inc  ·  SoF 2847  │ │
│  ○ Formula   │  └─────────────────────────────────────┘ │
│  ○ Dirt      │  ┌─────────────────────────────────────┐ │
│              │  │ P1  Watkins Glen  IMSA SportsCar     │ │
│  Series      │  │     +86 iR  ·  0 inc  ·  SoF 3102  │ │
│  [select ▾]  │  └─────────────────────────────────────┘ │
│              │                                          │
│  Search      │  ── Mar 2025 ──────────────────────      │
│  [_______]   │  ...                                     │
└──────────────┴──────────────────────────────────────────┘
```

- Races grouped by month, chronological
- Position: very large JetBrains Mono, color-coded
- iR delta and incidents always visible, prominent
- Click to expand: lap times, start position, full subsession detail (reuses `RaceDetailModal`)

---

### `/v2/series/[seriesId]` — Series Focus

Championship points and the season schedule are the story.

```
┌─────────────────────────────────────────────────────────┐
│  [← Back]  [Series Name]  [• Road]                     │
│                                                         │
│  CHAMPIONSHIP HERO                                      │
│  Points: 347   Rank: 12th   Weeks raced: 8/12          │
│  [championship points progress bar — full width]       │
│                                                         │
│  SEASON TIMELINE                                        │
│  Wk1  Wk2  Wk3  Wk4  Wk5  Wk6  Wk7  Wk8  ···         │
│  [P2] [P1] [P4] [P3] [P7] [P2] [P1] [P5] [ ] [ ]...   │
│  Completed=dot with result, active=pulsing, future=dim  │
│                                                         │
│  STATS GRID (Season / Positions / Pace / Race Quality)  │
│                                                         │
│  FINISH POSITION CHART (full width, embedded)          │
│                                                         │
│  RACE RESULTS TABLE                                     │
│  (compact, sortable — reuses existing data + modals)   │
└─────────────────────────────────────────────────────────┘
```

- 12-week timeline as visual dot pills (not a table grid)
- Charts inline, not behind a tab toggle
- Championship progress bar as the true hero metric

---

### `/v2/rivals` — Rivals

People-focused cards as primary view, searchable table as secondary.

```
┌─────────────────────────────────────────────────────────┐
│  [Opponents: 412]  [Rivals: 8]  [Cross-series: 23]     │
│  [Rivals]  [All] ← tab pills                           │
│                                                         │
│  RIVALS GRID (2 col desktop, 1 col mobile)             │
│  ┌─────────────────────┐  ┌─────────────────────────┐  │
│  │  Driver Name        │  │  Driver Name            │  │
│  │  iR: 3,204  vs +82  │  │  iR: 2,891  vs -210    │  │
│  │  Win rate:          │  │  Win rate:              │  │
│  │  ████░░░░  38%      │  │  ██████░░  61%          │  │
│  │  [Formula] [Road]   │  │  [Oval]                 │  │
│  │  [Rival ▾]          │  │  [Friendly ▾]           │  │
│  └─────────────────────┘  └─────────────────────────┘  │
│                                                         │
│  ALL OPPONENTS TABLE                                    │
│  (avatar circle, name, iR, frequency, last seen, tag)  │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure

### New files only — nothing existing is modified

```
src/app/v2/
├── layout.tsx                     ← V2 shell: fonts, left rail nav, CSS variables
├── page.tsx                       ← Season HQ
├── races/page.tsx                 ← Race Log
├── rivals/page.tsx                ← Rivals
└── series/[seriesId]/page.tsx     ← Series Focus

src/components/v2/
├── V2Shell.tsx                    ← Left rail + mobile bottom bar
├── V2Nav.tsx                      ← Navigation items + driver selector
├── SeasonHQ.tsx                   ← Season HQ page component
├── RaceLog.tsx                    ← Race Log page component
├── SeriesFocus.tsx                ← Series Focus page component
├── RivalsView.tsx                 ← Rivals page component
├── RaceCard.tsx                   ← Individual race card (Race Log)
├── SeriesRow.tsx                  ← Series row with inline sparkline
├── SeasonTimeline.tsx             ← 12-week dot timeline
└── StatChip.tsx                   ← Small stat display unit
```

### Reused without modification

- All API routes (`src/app/api/**`)
- `DriverDataContext`, all hooks
- All chart components (`src/components/charts/*`)
- `RaceDetailModal`, `RaceComparison`
- `DriverSelector`, `ThemeToggle`

### Font loading

Syne and JetBrains Mono via `next/font/google` in the V2 layout — scoped to `/v2/*` routes only.
