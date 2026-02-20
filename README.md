# iRacing Season Tracker

Track and visualize your iRacing season performance with detailed race history, interactive charts, and comprehensive statistics.

## Features

### Dashboard
- **Driver Profile** - View license levels, iRating, and Safety Rating across all categories (Road, Oval, Dirt Road, Dirt Oval)
- **Active Series** - See all series you've competed in this season at a glance
- **Quick Stats** - Races entered, average finish, points earned per series

### Race History
- **Full Season Data** - Fetches your complete race history for the current iRacing season
- **Multi-Class Support** - Properly displays and tracks in-class positions for multi-class series (IMSA, ESS, etc.)
- **Race Details** - Click any race to see lap times, rating changes, incidents, and position changes
- **Filtering & Sorting** - Filter by track, position, incidents, or date range
- **Race Comparison** - Select multiple races to compare performance side-by-side
- **Series Detail View** - Deep dive into individual series with schedule, results, and statistics

### Season Schedule
- **Weekly Track Schedule** - View the full 12-week season schedule for each series
- **Race Results by Week** - See your results for each week with points earned
- **Counting Weeks Highlight** - Visual indication of which weeks count toward championship (best 8 of 12)
- **Season Points Total** - Running total of championship points with counting weeks breakdown
- **Drop Week Tracking** - Easily identify which weeks are being dropped from your championship total

### Charts & Analytics
- **iRating by Discipline** - Track your overall iRating progression across iRacing's 5 categories (Sports Car, Formula, Oval, Dirt Road, Dirt Oval) with tabbed interface
- **Virtual iRating by Series** - Track your iRating progression as if calculated per-series, shown week-by-week
- **Championship Points by Series** - Bar chart and table showing points breakdown with best 8 weeks counting
- **Finish Position Trends** - Track your in-class finishing positions over time with rolling average
- **Incident Analysis** - Track incident counts per race with trend visualization
- **Strength of Field Distribution** - See the SoF range you've been racing in and your performance in each bracket
- **Achievement Stats** - Poles, wins, podiums, top 5s, and average finish broken down by series

### Multi-Driver Support
- **Quick Switching** - Easily switch between different driver profiles
- **Recent Drivers** - Automatically saves recently viewed drivers for quick access
- **Any Public Profile** - Look up any iRacing member by Customer ID

## Tech Stack

- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **React Query** - Data fetching and caching
- **Recharts** - Interactive data visualization

## Getting Started

### Prerequisites

- Node.js 18+
- An iRacing membership (for API credentials)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jadavison91/iracing-season-tracker.git
   cd iracing-season-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your iRacing credentials:
   ```env
   IRACING_USERNAME=your-iracing-email
   IRACING_PASSWORD=your-iracing-password
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and enter a Customer ID to get started.

### Finding Your Customer ID

Your Customer ID can be found in your iRacing profile URL:
```
https://members.iracing.com/membersite/member/CareerStats.do?custid=123456
                                                              ^^^^^^
```

## API Authentication

This app uses iRacing's OAuth2 Password Limited Grant for authentication. Your credentials are only used server-side to authenticate with the iRacing Data API - they are never exposed to the browser.

The app fetches publicly available race data, so you can look up any driver's statistics by their Customer ID.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add your environment variables (`IRACING_USERNAME`, `IRACING_PASSWORD`)
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js. Ensure your environment variables are configured for the iRacing API authentication.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT

## Disclaimer

This project is not affiliated with or endorsed by iRacing.com. iRacing is a trademark of iRacing.com Motorsport Simulations, LLC.
