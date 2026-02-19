# Product Requirements Document
## iRacing Season Tracker

**Version:** 1.0  
**Date:** February 15, 2026  
**Author:** Jason  
**Status:** Draft

---

## Executive Summary

Build a personal web application to track and visualize race performance across iRacing series seasons. The application will authenticate once using OAuth2 Password Limited Grant, then fetch and display publicly available race data for any driver. The focus is on series participation, race-by-race results, performance metrics, and standings comparison - presented in an intuitive dashboard format.

---

## Product Vision

Create a lightweight, fast-loading dashboard that answers the question: "How am I performing across the series I'm racing this season?" The application uses a single authentication layer to access iRacing's public race data, allowing viewing of your own stats as well as comparing performance with other drivers in your standings. Focus is on clear data presentation and quick insights into progress, weaknesses, and achievements within active racing series.

---

## Goals & Success Criteria

### Primary Goals
1. **Data Access**: Successfully authenticate and retrieve race data from iRacing API
2. **Core Visualization**: Display series participation and race-by-race results
3. **Performance Tracking**: Show key metrics (finish position, points, lap times)
4. **Multi-Driver Viewing**: Allow viewing any driver's public race data by Customer ID
5. **Deployment**: Live, accessible web application

### Success Metrics
- OAuth2 authentication flow completes successfully
- Race data loads within 3 seconds
- Application deployed and accessible via Vercel
- Can view data for current and past seasons
- Mobile-responsive interface

---

## User Personas

### Primary User: Jason (Solo Developer/Racer)
- **Role**: iRacing participant, technology professional
- **Technical Level**: High - comfortable with APIs, coding, infrastructure
- **Goals**: 
  - Track performance across multiple series
  - Identify areas for improvement
  - Compare pace to field
  - Monitor season-long progress
  - Compare performance with friends and rivals
- **Pain Points**:
  - iRacing website doesn't provide consolidated series view
  - Manual tracking is time-consuming
  - Wants deeper analysis of lap time performance
  - Difficult to compare stats with specific competitors

### Secondary Users: Racing Friends
- **Role**: iRacing participants in Jason's racing circles
- **Technical Level**: Varies - not assumed to be technical
- **Goals**:
  - View their own race history without building a tool
  - Compare performance with Jason and other friends
- **Pain Points**:
  - Same as primary user but without technical skills to build solutions
- **Usage Pattern**: Visit site, enter their Customer ID, view their stats

---

## Product Scope

### In Scope (MVP - Phase 1)

#### Backend Infrastructure
- OAuth2 Password Limited Grant authentication client
- Single authentication using developer's credentials
- Node.js API wrapper for iRacing Data API endpoints
- Token management (access & refresh)
- Rate limiting handling
- Basic error handling and logging

#### Data Layer
- Fetch any member's recent races by Customer ID
- Fetch season results by series
- Fetch detailed subsession (race) data
- Fetch standings and public member stats
- Optional: Browser localStorage cache for recently viewed drivers

#### Frontend (Next.js on Vercel)
- **Authentication Flow**
  - Server-side OAuth using developer credentials
  - No user login required
  
- **Driver Selection**
  - Default view shows developer's stats (Customer ID from environment)
  - Input to view other drivers by Customer ID
  - Save recently viewed drivers in localStorage
  
- **Dashboard Home**
  - List of active series for selected driver
  - Quick stats per series (races entered, avg finish, total points)
  
- **Series Detail View**
  - Week-by-week race history for selected series and driver
  - Per-race details:
    - Date/Time
    - Track
    - Finish position
    - Starting position
    - Points earned
    - Fastest lap time
    - Overall fastest lap (for comparison)
    - Gap to fastest lap

#### Deployment
- Vercel hosting for frontend
- Serverless functions for backend API
- Environment variable management for secrets (OAuth credentials, default Customer ID)

### Out of Scope (Future Phases)

**Phase 2 - Enhanced Analytics**
- iRating/Safety Rating trend graphs over time
- Incident tracking and analysis
- Quali vs. race performance comparison
- Week-over-week improvement trends
- Head-to-head driver comparisons

**Phase 3 - Advanced Features**
- Performance heatmaps by track
- Best/worst track identification
- Car-specific performance metrics
- Predictive finish position modeling
- Championship points scenarios

**Phase 4 - Sharing & Social**
- Race session highlights/replays
- Share achievements on social media
- Driver comparison widgets

**Not Planned**
- Live timing during races (requires different SDK - node-irsdk)
- Setup sharing/management
- League management features
- User authentication system (not needed - public data accessible by Customer ID)
- Database for user accounts (not needed - browser storage sufficient)

---

## Public Data Architecture

### Key Insight: Most iRacing Data is Public

Once authenticated with valid credentials, the iRacing Data API allows querying **publicly available** race data for any member by passing their Customer ID. This includes:

- Race results and standings
- Lap times and performance metrics
- Championship points
- iRating and Safety Rating history
- Career statistics

### Single Authentication, Multi-Driver Access

```
Your App (authenticated once with your credentials)
    ↓
Can query data for:
    - You (default Customer ID)
    - Friend #1 (their Customer ID)
    - Friend #2 (their Customer ID)
    - Any driver in your races (their Customer ID)
```

### Finding Customer IDs

Users can find their Customer ID in their iRacing member profile URL:
```
https://members.iracing.com/membersite/member/CareerStats.do?custid=123456
                                                                  ^^^^^^
                                                              Customer ID
```

### Privacy & Ethics

- **What's OK**: Viewing public race results, standings, and performance metrics (same data visible on iRacing website)
- **What's NOT OK**: Attempting to access private data, account details, or circumvent iRacing's terms of service
- **Best Practice**: Inform users that all data displayed is publicly available to any iRacing member

---

## Technical Architecture

### Stack

**Frontend**
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui or custom components
- **State Management**: React Query for API data caching
- **Charts**: Recharts or Chart.js
- **Storage**: Browser localStorage for recently viewed drivers

**Backend**
- **Runtime**: Node.js 20+
- **API Client**: Custom built using Axios
- **Authentication**: OAuth2 Password Limited Grant (server-side only)
- **Deployment**: Vercel Serverless Functions

**Database**
- Not required for MVP
- Browser localStorage sufficient for saving recently viewed drivers
- Future: Optional Supabase for caching race data at scale

**External Services**
- iRacing Data API (`https://members-ng.iracing.com/data`)
- iRacing OAuth Service (`https://oauth.iracing.com/oauth2`)

### System Architecture

```
┌─────────────────────────────┐
│   Next.js App (Vercel)      │
│   - Dashboard UI            │
│   - Driver Selection        │
│   - Series/Race Views       │
│   - localStorage Cache      │
└────────┬────────────────────┘
         │
         │ HTTP Requests
         │
┌────────▼────────────────────┐
│  Vercel Serverless Functions│
│  (API Routes)               │
│  - /api/auth/token          │
│  - /api/driver/[id]/races   │
│  - /api/series/[id]/results │
│  - /api/subsession/[id]     │
│                             │
│  OAuth Client (singleton)   │
│  - Manages access token     │
│  - Auto-refresh on expiry   │
└────────┬────────────────────┘
         │
         │ OAuth2 + REST
         │
┌────────▼────────────┐
│  iRacing Services   │
│  - OAuth API        │
│  - Data API         │
│    (Public race     │
│     data for any    │
│     customer ID)    │
└─────────────────────┘
```

### Data Flow

1. **Authentication (Server-Side, Once)**
   ```
   App Startup → API Route → iRacing OAuth (Password Limited) → 
   Store Access/Refresh Tokens → Singleton OAuth Client Ready
   ```

2. **Data Fetching (Any Driver)**
   ```
   User Enters Customer ID → API Route → 
   Check Token (refresh if needed) → 
   Call iRacing Data API with customer_id param → 
   Transform Data → Return to Frontend → 
   Cache in React Query + localStorage
   ```

3. **Token Refresh (Automatic)**
   ```
   Token Expiry Detected → API Route Intercept → 
   Use Refresh Token → Get New Access Token → 
   Retry Original Request → Continue
   ```

4. **Driver Switching**
   ```
   User Changes Customer ID → Load from localStorage Cache (if exists) →
   Fetch New Data (if cache miss) → Update UI
   ```

---

## API Integration Specifications

### Required iRacing Credentials
- Client ID (from iRacing support - request sent)
- Client Secret (from iRacing support - request sent)
- iRacing Username (your account)
- iRacing Password (your account)

**Note**: These credentials authenticate the APPLICATION, not individual users. Once authenticated, the app can query public data for any driver using their Customer ID.

### Key Endpoints to Implement

#### 1. Authentication
- **Endpoint**: `POST https://oauth.iracing.com/oauth2/token`
- **Grant Type**: `password_limited`
- **Response**: Access token, Refresh token, Expiry
- **Frequency**: Once on startup, refresh when expired

#### 2. Recent Races (Any Driver)
- **Endpoint**: `GET /data/stats/member_recent_races`
- **Parameters**: `cust_id` (required - the driver to query)
- **Response**: Array of recent race sessions
- **Usage**: Pass any Customer ID to view that driver's races

#### 3. Season Results
- **Endpoint**: `GET /data/results/season_results`
- **Parameters**: `season_id`, `event_type`, `race_week_num`
- **Response**: Results for specific season/series (includes all drivers)
- **Usage**: View standings and results for entire series

#### 4. Subsession Details
- **Endpoint**: `GET /data/results/get`
- **Parameters**: `subsession_id`
- **Response**: Detailed race results including lap times, positions, points for all participants
- **Usage**: Deep dive into any specific race

#### 5. Member Summary (Any Driver)
- **Endpoint**: `GET /data/stats/member_summary`
- **Parameters**: `cust_id` (required)
- **Response**: Current iRating, Safety Rating, license class
- **Usage**: Display driver info header

#### 6. Series Information
- **Endpoint**: `GET /data/series/get`
- **Response**: Information about all active series
- **Usage**: Build series list and metadata

#### 7. Series Seasons with Schedule (Phase 4) - VERIFIED
- **Endpoint**: `GET /data/series/seasons`
- **Parameters**: `series_id`
- **Response**: Full season data including `schedules` array with 12 weeks
- **Schedule Entry Fields**:
  - `race_week_num` (0-11)
  - `start_date` (ISO date)
  - `track.track_id`
  - `track.track_name`
  - `track.config_name`
- **Usage**: Display full season grid, determine current week, match races to weeks

### Data Models

```typescript
interface DriverProfile {
  customerId: number;
  displayName: string;
  iRating: number;
  safetyRating: number;
  licenseClass: string;
  lastViewed?: Date; // for localStorage caching
}

interface RaceResult {
  subsessionId: number;
  customerId: number; // the driver these results are for
  sessionDate: Date;
  trackName: string;
  seriesName: string;
  seriesId: number;
  raceWeekNum: number;
  startingPosition: number;
  finishPosition: number;
  champPoints: number;
  incidents: number;
  fastestLapTime: number; // milliseconds
  subsessionFastestLap: number; // milliseconds
  lapTimeGap: number; // calculated: my lap - fastest lap
}

interface SeriesSummary {
  seriesId: number;
  seriesName: string;
  seasonId: number;
  customerId: number; // the driver this summary is for
  racesEntered: number;
  avgFinish: number;
  totalPoints: number;
  bestFinish: number;
  worstFinish: number;
}

interface SubsessionDetail {
  subsessionId: number;
  sessionResults: DriverResult[];
  lapData: LapData[];
  // ... additional fields as needed
}

interface RecentDrivers {
  // Stored in localStorage
  drivers: DriverProfile[];
  default: number; // default customerId to load
}

// Season Schedule Models (Phase 4)
interface SeasonSchedule {
  seriesId: number;
  seriesName: string;
  seasonId: number;
  seasonYear: number;
  seasonQuarter: number; // 1-4
  weeks: WeekSchedule[];
}

interface WeekSchedule {
  weekNum: number; // 0-11 (iRacing uses 0-indexed)
  displayWeek: number; // 1-12 (for display)
  trackId: number;
  trackName: string;
  trackConfig?: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
}

interface WeekResult {
  weekNum: number;
  schedule: WeekSchedule;
  status: 'completed' | 'active' | 'upcoming' | 'skipped';
  bestResult: RaceResult | null;
  totalAttempts: number;
  allResults: RaceResult[];
}
```

---

## User Interface Specifications

### Page Structure

#### 0. Driver Selector (Global Component)
**Purpose**: Switch between different drivers

**Components**:
- Input field for Customer ID
- Dropdown of recently viewed drivers (from localStorage)
- Current driver name and basic stats (iRating, SR)
- "Set as Default" option

**Layout**: Persistent in header/navbar across all pages

#### 1. Home/Dashboard (`/`)
**Purpose**: Overview of current season participation for selected driver

**Components**:
- Header with selected driver info (name, iRating, Safety Rating)
- Grid/list of active series cards for this driver
- Each card shows:
  - Series logo/name
  - Races completed / total weeks
  - Current points standing
  - Average finish position
  - "View Details" link

**Layout**: Responsive grid (3 cols desktop, 1 col mobile)

#### 2. Series Detail (`/series/[seriesId]`)
**Purpose**: Week-by-week breakdown for specific series

**Components**:
- Series header (name, season, current week)
- Summary stats (races, points, avg finish)
- Table of race results with columns:
  - Week #
  - Date
  - Track
  - Start Pos
  - Finish Pos
  - Points
  - Fastest Lap
  - Gap to Fastest
  - Details button
- Sort/filter options (by week, track, date)

**Layout**: Full-width table, mobile converts to cards

#### 3. Race Detail Modal/Page (`/race/[subsessionId]`)
**Purpose**: Deep dive into single race session

**Components**:
- Session info (date, track, splits, SOF)
- Personal result summary
- Lap-by-lap data (if available)
- Position chart over race
- Comparison to field

**Layout**: Modal overlay or dedicated page

---

## Non-Functional Requirements

### Performance
- Initial page load < 2 seconds
- API responses cached for 5 minutes
- Lazy load race details on demand
- Optimize images (series logos, track images)

### Security
- OAuth credentials stored as environment variables
- No client-side storage of API tokens
- All API calls server-side only
- Rate limiting to prevent abuse

### Reliability
- Graceful degradation if API unavailable
- Clear error messages for failed requests
- Retry logic with exponential backoff
- Offline mode shows cached data

### Scalability
- Built for single user (no multi-tenancy needed)
- Can handle 100+ races per series
- Minimal database queries (or no DB in MVP)

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader friendly
- Color contrast ratios > 4.5:1

### Browser Support
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile: iOS Safari, Chrome Android

---

## Development Phases

### Phase 1: Infrastructure (Week 1-2)
**Goal**: Establish API connectivity and data flow

**Tasks**:
- Set up Next.js project with TypeScript
- Implement OAuth2 Password Limited Grant client (server-side singleton)
- Build API wrapper for iRacing endpoints with customer_id parameter support
- Create Vercel serverless API routes
- Implement token refresh logic
- Test authentication and data fetching for multiple Customer IDs
- Deploy to Vercel staging

**Success Criteria**:
- Can authenticate successfully with your credentials
- Can fetch races for any Customer ID
- Can fetch series results and standings
- Can fetch subsession details
- Token auto-refresh works
- All deployed to Vercel staging environment

### Phase 2: Core UI (Week 3-4)
**Goal**: Build dashboard and series view with driver switching

**Tasks**:
- Design component structure
- Implement Driver Selector component (header)
- Build Dashboard with series cards
- Build Series Detail table
- Implement localStorage for recently viewed drivers
- Add loading states and error handling
- Implement responsive design
- Basic styling with Tailwind
- Customer ID validation and error messages

**Success Criteria**:
- Can switch between different drivers via Customer ID
- Recently viewed drivers saved and accessible
- Can view all active series for selected driver
- Can drill into series details
- Can see race-by-race results
- Mobile responsive
- Deployed to production

### Phase 3: Polish & Enhancement (Week 5+)
**Goal**: Improve UX and add nice-to-have features

**Tasks**:
- Add race detail modal
- Implement lap time comparison
- Add sorting/filtering
- Optimize performance
- Add basic charts
- Improve error messages

**Success Criteria**:
- Smooth user experience
- Fast load times
- Clear data presentation
- Production ready

### Phase 4: Season Schedule Integration (Week 7+)
**Goal**: Display full 12-week season schedule with driver results per week

#### Overview
iRacing seasons run for 12 weeks, with each week featuring a specific track for each series. This phase adds the ability to display the complete season schedule and show driver results mapped to each week.

#### Features

**4.1 Season Schedule Display**
- Show all 12 weeks of the season in the Series Detail view
- Each week displays:
  - Week number (1-12)
  - Track name and configuration
  - Race status: Completed / Upcoming / Skipped
  - Best result (if completed)
- Visual distinction between completed weeks, current week, and future weeks
- Countdown or indicator for current active week

**4.2 Best Result Per Week**
- When a driver completes multiple races in the same week (same track/car/series):
  - Only display the **best result** based on Championship Points
  - Store all attempts but surface only the best
  - Optional: Show attempt count (e.g., "Best of 3 attempts")
- Calculation logic:
  ```
  For each week:
    Filter races by: series_id + race_week_num
    Sort by: champ_points DESC
    Return: First result (highest points)
  ```

**4.3 Schedule Data Ingestion**
- **Solution**: Use iRacing Data API directly (verified available)

  **API Endpoint: `/data/series/seasons`**
  - Returns full season data including `schedules` array
  - Each schedule entry contains:
    - `race_week_num` (0-11, 0-indexed)
    - `start_date` (ISO date string)
    - `track.track_id`
    - `track.track_name`
    - `track.config_name` (track configuration, if applicable)
  - Complete 12-week schedule available for all series
  - No manual data entry or PDF parsing required

  **Implementation**:
  - Add `getSeriesSeasons(seriesId)` function to API client
  - Create API route: `GET /api/series/[seriesId]/schedule`
  - Cache schedule data (changes infrequently)

**4.4 Schedule Data Model**

```typescript
interface SeasonSchedule {
  seriesId: number;
  seriesName: string;
  seasonId: number;
  seasonYear: number;
  seasonQuarter: number; // 1-4
  weeks: WeekSchedule[];
}

interface WeekSchedule {
  weekNum: number; // 0-11 (iRacing uses 0-indexed)
  displayWeek: number; // 1-12 (for display)
  trackId: number;
  trackName: string;
  trackConfig?: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  isActive: boolean;
  isComplete: boolean;
}

interface WeekResult {
  weekNum: number;
  trackName: string;
  bestResult: RaceResult | null;
  totalAttempts: number;
  allResults: RaceResult[]; // For "show all attempts" feature
}
```

**4.5 UI Components**

**Season Schedule Grid**
```
┌─────────────────────────────────────────────────────────────┐
│ Week │ Track                    │ Result    │ Points │ Att  │
├─────────────────────────────────────────────────────────────┤
│  1   │ Daytona Road Course      │ P3        │ 142    │ 2/2  │
│  2   │ Sebring International    │ P7        │ 98     │ 1/1  │
│  3   │ Road Atlanta             │ P1 🏆     │ 168    │ 3/3  │
│  4   │ Watkins Glen             │ --        │ --     │ 0    │
│  5   │ Suzuka Circuit           │ P4        │ 121    │ 1/1  │
│  6   │ Spa-Francorchamps     ◀  │ In Progress...     │      │
│  7   │ Nürburgring GP           │           │        │      │
│  8   │ Monza                    │           │        │      │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

**Week Detail Expansion**
- Click week row to expand and show all attempts
- Compare attempts side-by-side
- See why one result was "best" (points breakdown)

#### Tasks

**Backend**
- [x] Research iRacing API for schedule endpoints (DONE - `/series/seasons` provides full schedule)
- [ ] Add `getSeriesSeasons(seriesId)` function to API client
- [ ] Create API endpoint: `GET /api/series/[seriesId]/schedule`
- [ ] Create API endpoint: `GET /api/series/[seriesId]/week/[weekNum]/results`
- [ ] Implement "best result" aggregation logic
- [ ] Add `race_week_num` to race data transformation

**Frontend**
- [ ] Build `SeasonScheduleTable` component
- [ ] Build `WeekRow` component with expand/collapse
- [ ] Add week status indicators (complete/active/upcoming)
- [ ] Implement "best of N attempts" display
- [ ] Add schedule view toggle (grid vs list)
- [ ] Mobile-responsive schedule view

#### Success Criteria
- Series page shows full 12-week schedule
- Each week shows track and best result
- Multiple attempts correctly aggregated to best result
- Current week is highlighted
- Future weeks shown as upcoming
- Schedule data can be updated for new seasons

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| iRacing API changes | High | Medium | Monitor iRacing forums, build flexible client |
| OAuth2 approval delay | Medium | Low | Start request process immediately |
| Rate limiting issues | Medium | Medium | Implement caching, respect rate limits |
| Data structure changes | Medium | Low | Use TypeScript for type safety, version API calls |
| Vercel cold starts | Low | High | Acceptable for personal app, can optimize later |

---

## Environment Variables

The application requires the following environment variables (stored in `.env.local` for development, Vercel environment variables for production):

```bash
# iRacing OAuth Credentials (from iRacing support)
IRACING_CLIENT_ID=your_client_id_here
IRACING_CLIENT_SECRET=your_client_secret_here

# Your iRacing Account (for Password Limited Grant)
IRACING_USERNAME=your_email@example.com
IRACING_PASSWORD=your_iracing_password

# Default Driver (your Customer ID)
DEFAULT_CUSTOMER_ID=123456

# Optional: API Configuration
IRACING_API_BASE_URL=https://members-ng.iracing.com/data
IRACING_OAUTH_BASE_URL=https://oauth.iracing.com/oauth2

# Optional: Caching
API_CACHE_TTL=300000  # 5 minutes in milliseconds
```

---

## Dependencies

### External Dependencies
- iRacing OAuth2 credentials (must request from iRacing)
- Vercel account (free tier sufficient)
- Node.js 20+ for development

### Internal Dependencies
- None (greenfield project)

---

## Open Questions

1. **Database**: Do we need Supabase for caching, or is React Query + localStorage sufficient?
   - **Decision**: Start without DB. Use localStorage for recently viewed drivers and React Query for API caching.

2. **Historical Data**: How far back should we fetch race history?
   - **Recommendation**: Current season + previous season (configurable)

3. **Refresh Frequency**: How often should we refresh data?
   - **Recommendation**: Manual refresh on page load, 5-minute React Query cache

4. **Multi-Driver UX**: Should Customer ID be visible or hidden?
   - **Recommendation**: Visible in header, explain how to find it (iRacing profile URL)

5. **Default Driver**: How to handle first-time visitors?
   - **Recommendation**: Load developer's Customer ID from env variable as default, show driver selector prominently

---

## Appendix

### A. iRacing API Documentation
- OAuth Service: https://oauth.iracing.com/oauth2/book/
- Data API: Referenced in community wrappers and forums

### B. Technical References
- Next.js: https://nextjs.org/docs
- Vercel: https://vercel.com/docs
- React Query: https://tanstack.com/query/latest

### C. Design References
- iRacing member portal for data structure inspiration
- Simplicity over feature bloat

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-15 | Jason | Initial PRD |
| 1.1 | 2026-02-15 | Jason | Updated to reflect simplified architecture: Password Limited Grant with multi-driver capability via Customer ID. Removed database requirement, simplified authentication flow, added public data architecture section. |
| 1.2 | 2026-02-19 | Jason | Added Phase 4: Season Schedule Integration. Features include 12-week schedule display, best result per week aggregation. Verified `/series/seasons` API provides full schedule - no PDF parsing needed. |

---

## Approval

This PRD will be reviewed and approved by: Jason (Product Owner / Developer)

**Status**: Ready for Development ✅
