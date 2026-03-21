import { DriverProfile, MemberSummary, RecentRace, Series, License } from './iracing/types';

// ============================================================================
// Mock Driver Data
// ============================================================================

export const MOCK_CUSTOMER_ID = 679948;

export const mockDriverProfile: DriverProfile = {
  custId: MOCK_CUSTOMER_ID,
  displayName: 'Jason Davison',
  iRating: 2560,
  safetyRating: 3.58,
  licenseClass: 'B',
  licenseLevel: 4,
  clubName: 'California',
};

export const mockLicenses: License[] = [
  {
    categoryId: 2,
    category: 'road',
    licenseLevel: 14,
    safetyRating: 358, // 3.58
    iRating: 2560,
    color: '#0099FF',
    groupName: 'B',
  },
  {
    categoryId: 1,
    category: 'oval',
    licenseLevel: 8,
    safetyRating: 299,
    iRating: 1234,
    color: '#FFD600',
    groupName: 'D',
  },
  {
    categoryId: 4,
    category: 'dirt_road',
    licenseLevel: 12,
    safetyRating: 440,
    iRating: 1762,
    color: '#00C853',
    groupName: 'C',
  },
  {
    categoryId: 3,
    category: 'dirt_oval',
    licenseLevel: 4,
    safetyRating: 250,
    iRating: 1100,
    color: '#F44336',
    groupName: 'R',
  },
];

export const mockMemberSummary: MemberSummary = {
  custId: MOCK_CUSTOMER_ID,
  displayName: 'Jason Davison',
  clubId: 37,
  clubName: 'California',
  licenses: mockLicenses,
};

// ============================================================================
// Mock Series Data
// ============================================================================

export const mockSeries: Series[] = [
  {
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    seriesShortName: 'Production Car Challenge',
    categoryId: 5,
    category: 'sports_car',
    active: true,
    official: true,
    fixedSetup: false,
  },
  {
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    seriesShortName: 'SRF Challenge',
    categoryId: 5,
    category: 'sports_car',
    active: true,
    official: true,
    fixedSetup: true,
  },
  {
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    seriesShortName: 'Pro 2 Lite Rookie',
    categoryId: 4,
    category: 'dirt_road',
    active: true,
    official: true,
    fixedSetup: true,
  },
  {
    seriesId: 588,
    seriesName: 'Advanced Pro2 Lite Off Road Series by Trak Racer',
    seriesShortName: 'Advanced Pro2 Lite',
    categoryId: 4,
    category: 'dirt_road',
    active: true,
    official: true,
    fixedSetup: true,
  },
  {
    seriesId: 530,
    seriesName: 'Ford Mustang Challenge by Skip Barber',
    seriesShortName: 'Mustang Challenge',
    categoryId: 5,
    category: 'sports_car',
    active: true,
    official: true,
    fixedSetup: false,
  },
  {
    seriesId: 599,
    seriesName: 'FIA Cross Car Championship',
    seriesShortName: 'FIA Cross Car',
    categoryId: 4,
    category: 'dirt_road',
    active: true,
    official: true,
    fixedSetup: true,
  },
];

// ============================================================================
// Real Race Data (from JSON export)
// ============================================================================

// Helper to estimate iRating change based on finish position and SoF
// This is an approximation - real iRating calculation is more complex
function estimateIRatingChange(finishPosition: number, numDrivers: number, sof: number, yourIRating: number): number {
  const expectedFinish = (numDrivers + 1) / 2; // Middle of the pack
  const positionDelta = expectedFinish - finishPosition; // Positive if finished better than expected

  // Base change scaled by SoF difference and position
  const sofFactor = (sof - yourIRating) / 1000; // Positive if racing above your iRating
  const baseChange = positionDelta * 8 + sofFactor * 15;

  // Clamp to reasonable range
  return Math.round(Math.max(-80, Math.min(80, baseChange)));
}

// Starting iRatings for each category (will be adjusted as we process races)
const categoryStartingIRating: Record<number, number> = {
  5: 1600, // Sports Car (Road)
  4: 1500, // Dirt Road
};

// Track running iRating per category
const runningIRating: Record<number, number> = { ...categoryStartingIRating };

export const mockRecentRaces: RecentRace[] = [
  // Race 1: Spec Racer Ford @ Rudskogen
  {
    subsessionId: 82020927,
    seasonId: 5906,
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    sessionStartTime: '2025-12-19T21:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 451,
    trackName: 'Rudskogen Motorsenter',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 7,
    finishPosition: 6,
    startPositionInClass: 6,
    finishPositionInClass: 6,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 61,
    clubPoints: 8,
    incidents: 4,
    lapsComplete: 16,
    lapsLed: 0,
    averageLap: 908286,
    bestLapTime: 903390,
    bestNlapsTime: 0,
    newIRating: 2500,
    oldIRating: 2490,
    newSafetyRating: 340,
    oldSafetyRating: 335,
    strengthOfField: 2080,
    numDrivers: 20,
    winnerName: 'Ricardo J Faria',
    winnerCustId: 97829,
  },
  // Race 2: Production Car @ VIR (DNF)
  {
    subsessionId: 82040922,
    seasonId: 5898,
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    sessionStartTime: '2025-12-20T15:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 465,
    trackName: 'Virginia International Raceway - Full Course',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 12,
    finishPosition: 34,
    startPositionInClass: 34,
    finishPositionInClass: 34,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 18,
    clubPoints: 2,
    incidents: 15,
    lapsComplete: 7,
    lapsLed: 0,
    averageLap: 1190659,
    bestLapTime: 1184272,
    bestNlapsTime: 0,
    newIRating: 2430,
    oldIRating: 2500,
    newSafetyRating: 298,
    oldSafetyRating: 340,
    strengthOfField: 2669,
    numDrivers: 20,
    winnerName: 'Ilya V Ratiani',
    winnerCustId: 1277414,
  },
  // Race 3: Pro 2 Lite @ Wild West (WIN!)
  {
    subsessionId: 82043442,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2025-12-20T17:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 332,
    trackName: 'Wild West Motorsports Park',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 4,
    finishPosition: 1,
    startPositionInClass: 1,
    finishPositionInClass: 1,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 94,
    clubPoints: 12,
    incidents: 0,
    lapsComplete: 6,
    lapsLed: 0,
    averageLap: 537887,
    bestLapTime: 528369,
    bestNlapsTime: 0,
    newIRating: 1565,
    oldIRating: 1500,
    newSafetyRating: 395,
    oldSafetyRating: 380,
    strengthOfField: 2092,
    numDrivers: 20,
    winnerName: 'Jason Davison',
    winnerCustId: 679948,
  },
  // Race 4: FIA Cross Car @ Winton
  {
    subsessionId: 82044373,
    seasonId: 6038,
    seriesId: 599,
    seriesName: 'FIA Cross Car Championship',
    sessionStartTime: '2025-12-20T18:15:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 582,
    trackName: 'Winton Motor Raceway - Rallycross',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 7,
    finishPosition: 6,
    startPositionInClass: 6,
    finishPositionInClass: 6,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 14,
    clubPoints: 5,
    incidents: 4,
    lapsComplete: 6,
    lapsLed: 0,
    averageLap: 417352,
    bestLapTime: 412063,
    bestNlapsTime: 0,
    newIRating: 1578,
    oldIRating: 1565,
    newSafetyRating: 388,
    oldSafetyRating: 395,
    strengthOfField: 1772,
    numDrivers: 20,
    winnerName: 'Gabino Iglesias',
    winnerCustId: 812437,
  },
  // Race 5: Advanced Pro2 Lite @ Lucas Oil (P3)
  {
    subsessionId: 82072310,
    seasonId: 6021,
    seriesId: 588,
    seriesName: 'Advanced Pro2 Lite Off Road Series by Trak Racer',
    sessionStartTime: '2025-12-21T18:00:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 581,
    trackName: 'Lucas Oil Speedway - Dirt Road',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 2,
    finishPosition: 3,
    startPositionInClass: 3,
    finishPositionInClass: 3,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 50,
    clubPoints: 8,
    incidents: 2,
    lapsComplete: 9,
    lapsLed: 0,
    averageLap: 813493,
    bestLapTime: 790909,
    bestNlapsTime: 0,
    newIRating: 1592,
    oldIRating: 1578,
    newSafetyRating: 392,
    oldSafetyRating: 388,
    strengthOfField: 1409,
    numDrivers: 20,
    winnerName: 'Brian Root2',
    winnerCustId: 1339200,
  },
  // Race 6: Advanced Pro2 Lite @ Lucas Oil (P2, started on pole)
  {
    subsessionId: 82079297,
    seasonId: 6021,
    seriesId: 588,
    seriesName: 'Advanced Pro2 Lite Off Road Series by Trak Racer',
    sessionStartTime: '2025-12-21T23:00:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 581,
    trackName: 'Lucas Oil Speedway - Dirt Road',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 1,
    finishPosition: 2,
    startPositionInClass: 2,
    finishPositionInClass: 2,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 66,
    clubPoints: 10,
    incidents: 2,
    lapsComplete: 10,
    lapsLed: 0,
    averageLap: 803443,
    bestLapTime: 786974,
    bestNlapsTime: 0,
    newIRating: 1618,
    oldIRating: 1592,
    newSafetyRating: 396,
    oldSafetyRating: 392,
    strengthOfField: 1555,
    numDrivers: 20,
    winnerName: 'Richard Watkins3',
    winnerCustId: 1127850,
  },
  // Race 7: Pro 2 Lite Rookie @ Wild West (P5, started on pole)
  {
    subsessionId: 82103894,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2025-12-22T21:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 332,
    trackName: 'Wild West Motorsports Park',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 1,
    finishPosition: 5,
    startPositionInClass: 5,
    finishPositionInClass: 5,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 28,
    clubPoints: 6,
    incidents: 2,
    lapsComplete: 6,
    lapsLed: 0,
    averageLap: 543234,
    bestLapTime: 531285,
    bestNlapsTime: 0,
    newIRating: 1598,
    oldIRating: 1618,
    newSafetyRating: 390,
    oldSafetyRating: 396,
    strengthOfField: 1761,
    numDrivers: 20,
    winnerName: 'Oliver Golding',
    winnerCustId: 451552,
  },
  // Race 8: Pro 2 Lite Rookie @ USA International (P7)
  {
    subsessionId: 82108319,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2025-12-23T00:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 275,
    trackName: 'USA International Speedway - Dirt',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 7,
    finishPosition: 7,
    startPositionInClass: 7,
    finishPositionInClass: 7,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 9,
    clubPoints: 4,
    incidents: 0,
    lapsComplete: 12,
    lapsLed: 0,
    averageLap: 286302,
    bestLapTime: 280370,
    bestNlapsTime: 0,
    newIRating: 1582,
    oldIRating: 1598,
    newSafetyRating: 398,
    oldSafetyRating: 390,
    strengthOfField: 2451,
    numDrivers: 20,
    winnerName: 'Mychelle Cherry',
    winnerCustId: 568014,
  },
  // Race 9: Advanced Pro2 Lite @ Wild West (WIN!)
  {
    subsessionId: 82111635,
    seasonId: 6021,
    seriesId: 588,
    seriesName: 'Advanced Pro2 Lite Off Road Series by Trak Racer',
    sessionStartTime: '2025-12-23T03:00:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 332,
    trackName: 'Wild West Motorsports Park',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 2,
    finishPosition: 1,
    startPositionInClass: 1,
    finishPositionInClass: 1,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 81,
    clubPoints: 12,
    incidents: 0,
    lapsComplete: 12,
    lapsLed: 0,
    averageLap: 546639,
    bestLapTime: 537711,
    bestNlapsTime: 0,
    newIRating: 1645,
    oldIRating: 1582,
    newSafetyRating: 410,
    oldSafetyRating: 398,
    strengthOfField: 1586,
    numDrivers: 20,
    winnerName: 'Jason Davison',
    winnerCustId: 679948,
  },
  // Race 10: Advanced Pro2 Lite @ Wild West (P2, started on pole)
  {
    subsessionId: 82130508,
    seasonId: 6021,
    seriesId: 588,
    seriesName: 'Advanced Pro2 Lite Off Road Series by Trak Racer',
    sessionStartTime: '2025-12-23T21:00:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 332,
    trackName: 'Wild West Motorsports Park',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 1,
    finishPosition: 2,
    startPositionInClass: 2,
    finishPositionInClass: 2,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 53,
    clubPoints: 10,
    incidents: 2,
    lapsComplete: 11,
    lapsLed: 0,
    averageLap: 544787,
    bestLapTime: 536794,
    bestNlapsTime: 0,
    newIRating: 1662,
    oldIRating: 1645,
    newSafetyRating: 405,
    oldSafetyRating: 410,
    strengthOfField: 1678,
    numDrivers: 20,
    winnerName: 'Kenneth Skidmore',
    winnerCustId: 565752,
  },
  // Race 11: Production Car @ Miami (DNF-ish, P32)
  {
    subsessionId: 82179978,
    seasonId: 5898,
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    sessionStartTime: '2025-12-25T19:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 535,
    trackName: 'Miami International Autodrome - Extended MIA Loop',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 30,
    finishPosition: 32,
    startPositionInClass: 32,
    finishPositionInClass: 32,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 46,
    clubPoints: 3,
    incidents: 5,
    lapsComplete: 15,
    lapsLed: 0,
    averageLap: 774982,
    bestLapTime: 765295,
    bestNlapsTime: 0,
    newIRating: 2415,
    oldIRating: 2430,
    newSafetyRating: 292,
    oldSafetyRating: 298,
    strengthOfField: 2120,
    numDrivers: 20,
    winnerName: 'Dimitri Demeulemeester',
    winnerCustId: 593944,
  },
  // Race 12: Production Car @ Miami (P20, good recovery)
  {
    subsessionId: 82183606,
    seasonId: 5898,
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    sessionStartTime: '2025-12-25T22:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 535,
    trackName: 'Miami International Autodrome - Extended MIA Loop',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 28,
    finishPosition: 20,
    startPositionInClass: 20,
    finishPositionInClass: 20,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 105,
    clubPoints: 7,
    incidents: 4,
    lapsComplete: 18,
    lapsLed: 0,
    averageLap: 755917,
    bestLapTime: 749886,
    bestNlapsTime: 0,
    newIRating: 2440,
    oldIRating: 2415,
    newSafetyRating: 288,
    oldSafetyRating: 292,
    strengthOfField: 2261,
    numDrivers: 20,
    winnerName: 'Cash Felber',
    winnerCustId: 1053640,
  },
  // Race 13: Advanced Pro2 Lite @ Wild West (P7)
  {
    subsessionId: 82257738,
    seasonId: 6021,
    seriesId: 588,
    seriesName: 'Advanced Pro2 Lite Off Road Series by Trak Racer',
    sessionStartTime: '2025-12-28T16:00:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 332,
    trackName: 'Wild West Motorsports Park',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 7,
    finishPosition: 7,
    startPositionInClass: 7,
    finishPositionInClass: 7,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 34,
    clubPoints: 5,
    incidents: 0,
    lapsComplete: 12,
    lapsLed: 0,
    averageLap: 531769,
    bestLapTime: 525531,
    bestNlapsTime: 0,
    newIRating: 1638,
    oldIRating: 1662,
    newSafetyRating: 415,
    oldSafetyRating: 405,
    strengthOfField: 2814,
    numDrivers: 20,
    winnerName: 'Tom Monhemius',
    winnerCustId: 836922,
  },
  // Race 14: SRF @ Watkins Glen (WIN!)
  {
    subsessionId: 82296634,
    seasonId: 5906,
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    sessionStartTime: '2025-12-29T23:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 433,
    trackName: 'Watkins Glen International - Cup',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 9,
    finishPosition: 1,
    startPositionInClass: 1,
    finishPositionInClass: 1,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 107,
    clubPoints: 12,
    incidents: 2,
    lapsComplete: 18,
    lapsLed: 0,
    averageLap: 812210,
    bestLapTime: 804664,
    bestNlapsTime: 0,
    newIRating: 2485,
    oldIRating: 2440,
    newSafetyRating: 355,
    oldSafetyRating: 340,
    strengthOfField: 1905,
    numDrivers: 20,
    winnerName: 'Jason Davison',
    winnerCustId: 679948,
  },
  // Race 15: SRF @ Barber (P4)
  {
    subsessionId: 82350243,
    seasonId: 5906,
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    sessionStartTime: '2025-12-31T22:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 46,
    trackName: 'Barber Motorsports Park - Full Course',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 6,
    finishPosition: 4,
    startPositionInClass: 4,
    finishPositionInClass: 4,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 80,
    clubPoints: 9,
    incidents: 0,
    lapsComplete: 16,
    lapsLed: 0,
    averageLap: 940197,
    bestLapTime: 931948,
    bestNlapsTime: 0,
    newIRating: 2517,
    oldIRating: 2485,
    newSafetyRating: 368,
    oldSafetyRating: 355,
    strengthOfField: 1947,
    numDrivers: 20,
    winnerName: 'Eric Lancheres',
    winnerCustId: 309235,
  },
  // Race 16: Pro 2 Lite Rookie @ Daytona (P6)
  {
    subsessionId: 82377861,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2026-01-01T23:00:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 293,
    trackName: 'Daytona Rallycross and Dirt Road - Rallycross Long',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 6,
    finishPosition: 6,
    startPositionInClass: 6,
    finishPositionInClass: 6,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 18,
    clubPoints: 5,
    incidents: 0,
    lapsComplete: 6,
    lapsLed: 0,
    averageLap: 513986,
    bestLapTime: 479835,
    bestNlapsTime: 0,
    newIRating: 1646,
    oldIRating: 1638,
    newSafetyRating: 420,
    oldSafetyRating: 415,
    strengthOfField: 2328,
    numDrivers: 20,
    winnerName: 'Joseph Parker Jr',
    winnerCustId: 1175156,
  },
  // Race 17: Pro 2 Lite Rookie @ Daytona (P2)
  {
    subsessionId: 82404545,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2026-01-02T22:00:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 293,
    trackName: 'Daytona Rallycross and Dirt Road - Rallycross Long',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 3,
    finishPosition: 2,
    startPositionInClass: 2,
    finishPositionInClass: 2,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 77,
    clubPoints: 10,
    incidents: 0,
    lapsComplete: 6,
    lapsLed: 0,
    averageLap: 508945,
    bestLapTime: 476033,
    bestNlapsTime: 0,
    newIRating: 1694,
    oldIRating: 1646,
    newSafetyRating: 432,
    oldSafetyRating: 420,
    strengthOfField: 2168,
    numDrivers: 20,
    winnerName: 'Hristiyan Ivanovmk',
    winnerCustId: 1135511,
  },
  // Race 18: Production Car @ Snetterton (P26)
  {
    subsessionId: 82426166,
    seasonId: 5898,
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    sessionStartTime: '2026-01-03T16:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 298,
    trackName: 'Snetterton Circuit - 200',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 35,
    finishPosition: 26,
    startPositionInClass: 26,
    finishPositionInClass: 26,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 7,
    clubPoints: 4,
    incidents: 4,
    lapsComplete: 18,
    lapsLed: 0,
    averageLap: 790077,
    bestLapTime: 773680,
    bestNlapsTime: 0,
    newIRating: 2416,
    oldIRating: 2517,
    newSafetyRating: 282,
    oldSafetyRating: 288,
    strengthOfField: 1786,
    numDrivers: 20,
    winnerName: 'Pablo Hernandez15',
    winnerCustId: 1402288,
  },
  // Race 19: SRF @ Phoenix (P6)
  {
    subsessionId: 82616235,
    seasonId: 5906,
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    sessionStartTime: '2026-01-10T15:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 105,
    trackName: '[Legacy] Phoenix Raceway - 2008 Road Course',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 5,
    finishPosition: 6,
    startPositionInClass: 6,
    finishPositionInClass: 6,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 82,
    clubPoints: 8,
    incidents: 2,
    lapsComplete: 23,
    lapsLed: 0,
    averageLap: 641323,
    bestLapTime: 634358,
    bestNlapsTime: 0,
    newIRating: 2433,
    oldIRating: 2416,
    newSafetyRating: 372,
    oldSafetyRating: 368,
    strengthOfField: 2297,
    numDrivers: 20,
    winnerName: 'Casey Moseley',
    winnerCustId: 478527,
  },
  // Race 20: Production Car @ Daytona (P22, good recovery)
  {
    subsessionId: 82619856,
    seasonId: 5898,
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    sessionStartTime: '2026-01-10T18:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 192,
    trackName: 'Daytona International Speedway - Road Course',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 37,
    finishPosition: 22,
    startPositionInClass: 22,
    finishPositionInClass: 22,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 98,
    clubPoints: 7,
    incidents: 3,
    lapsComplete: 12,
    lapsLed: 0,
    averageLap: 1207390,
    bestLapTime: 1194916,
    bestNlapsTime: 0,
    newIRating: 2467,
    oldIRating: 2433,
    newSafetyRating: 286,
    oldSafetyRating: 282,
    strengthOfField: 2029,
    numDrivers: 20,
    winnerName: 'Cody S Smith',
    winnerCustId: 162353,
  },
  // Race 21: Pro 2 Lite Rookie @ Wild West (P4)
  {
    subsessionId: 82626814,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2026-01-10T23:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 332,
    trackName: 'Wild West Motorsports Park',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 4,
    finishPosition: 4,
    startPositionInClass: 4,
    finishPositionInClass: 4,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 45,
    clubPoints: 7,
    incidents: 2,
    lapsComplete: 6,
    lapsLed: 0,
    averageLap: 539487,
    bestLapTime: 525846,
    bestNlapsTime: 0,
    newIRating: 1690,
    oldIRating: 1694,
    newSafetyRating: 428,
    oldSafetyRating: 432,
    strengthOfField: 1885,
    numDrivers: 20,
    winnerName: 'Mason Kuhn',
    winnerCustId: 669402,
  },
  // Race 22: SRF @ Circuit Gilles Villeneuve (P2)
  {
    subsessionId: 82705878,
    seasonId: 5906,
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    sessionStartTime: '2026-01-13T21:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 218,
    trackName: 'Circuit Gilles Villeneuve',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 2,
    finishPosition: 2,
    startPositionInClass: 2,
    finishPositionInClass: 2,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 76,
    clubPoints: 10,
    incidents: 0,
    lapsComplete: 13,
    lapsLed: 0,
    averageLap: 1114154,
    bestLapTime: 1100959,
    bestNlapsTime: 0,
    newIRating: 2496,
    oldIRating: 2467,
    newSafetyRating: 385,
    oldSafetyRating: 372,
    strengthOfField: 1579,
    numDrivers: 20,
    winnerName: 'Fernando M Seixas',
    winnerCustId: 75005,
  },
  // Race 23: Production Car @ Zandvoort (P30)
  {
    subsessionId: 82829784,
    seasonId: 5898,
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    sessionStartTime: '2026-01-18T14:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 485,
    trackName: 'Circuit Zandvoort - Grand Prix',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 31,
    finishPosition: 30,
    startPositionInClass: 30,
    finishPositionInClass: 30,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 52,
    clubPoints: 4,
    incidents: 2,
    lapsComplete: 14,
    lapsLed: 0,
    averageLap: 1056053,
    bestLapTime: 1047135,
    bestNlapsTime: 0,
    newIRating: 2473,
    oldIRating: 2496,
    newSafetyRating: 290,
    oldSafetyRating: 286,
    strengthOfField: 1918,
    numDrivers: 20,
    winnerName: 'Adnan Grozdanic',
    winnerCustId: 684558,
  },
  // Race 24: Pro 2 Lite Rookie @ Phoenix (P7, started P4)
  {
    subsessionId: 82842190,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2026-01-18T23:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 472,
    trackName: '[Legacy] Phoenix Raceway - 2008 Dirt Road',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 4,
    finishPosition: 7,
    startPositionInClass: 7,
    finishPositionInClass: 7,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 8,
    clubPoints: 4,
    incidents: 2,
    lapsComplete: 2,
    lapsLed: 0,
    averageLap: 446213,
    bestLapTime: 434676,
    bestNlapsTime: 0,
    newIRating: 1625,
    oldIRating: 1690,
    newSafetyRating: 418,
    oldSafetyRating: 428,
    strengthOfField: 2265,
    numDrivers: 20,
    winnerName: 'Garrett Hess',
    winnerCustId: 266524,
  },
  // Race 25: Pro 2 Lite Rookie @ Phoenix (P2, started on pole)
  {
    subsessionId: 82867870,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2026-01-19T23:00:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 472,
    trackName: '[Legacy] Phoenix Raceway - 2008 Dirt Road',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 1,
    finishPosition: 2,
    startPositionInClass: 2,
    finishPositionInClass: 2,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 61,
    clubPoints: 10,
    incidents: 0,
    lapsComplete: 6,
    lapsLed: 0,
    averageLap: 446795,
    bestLapTime: 433759,
    bestNlapsTime: 0,
    newIRating: 1658,
    oldIRating: 1625,
    newSafetyRating: 430,
    oldSafetyRating: 418,
    strengthOfField: 1538,
    numDrivers: 20,
    winnerName: 'Mimi Leader',
    winnerCustId: 1346504,
  },
  // Race 26: Production Car @ Phoenix (P27)
  {
    subsessionId: 82993940,
    seasonId: 5898,
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    sessionStartTime: '2026-01-24T18:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 105,
    trackName: '[Legacy] Phoenix Raceway - 2008 Road Course',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 37,
    finishPosition: 27,
    startPositionInClass: 27,
    finishPositionInClass: 27,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 92,
    clubPoints: 6,
    incidents: 9,
    lapsComplete: 22,
    lapsLed: 0,
    averageLap: 637160,
    bestLapTime: 630677,
    bestNlapsTime: 0,
    newIRating: 2504,
    oldIRating: 2473,
    newSafetyRating: 268,
    oldSafetyRating: 290,
    strengthOfField: 2413,
    numDrivers: 20,
    winnerName: 'Diego Fernández5',
    winnerCustId: 1009174,
  },
  // Race 27: SRF @ MotorLand Aragon (P15)
  {
    subsessionId: 83019301,
    seasonId: 5906,
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    sessionStartTime: '2026-01-25T15:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 475,
    trackName: 'MotorLand Aragón - Grand Prix',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 12,
    finishPosition: 15,
    startPositionInClass: 15,
    finishPositionInClass: 15,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 30,
    clubPoints: 4,
    incidents: 8,
    lapsComplete: 11,
    lapsLed: 0,
    averageLap: 1368522,
    bestLapTime: 1360311,
    bestNlapsTime: 0,
    newIRating: 2447,
    oldIRating: 2504,
    newSafetyRating: 362,
    oldSafetyRating: 385,
    strengthOfField: 2339,
    numDrivers: 20,
    winnerName: 'Ales Pleva',
    winnerCustId: 635830,
  },
  // Race 28: SRF @ Oschersleben (P3)
  {
    subsessionId: 83207847,
    seasonId: 5906,
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    sessionStartTime: '2026-02-01T17:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 455,
    trackName: 'Motorsport Arena Oschersleben - B Course',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 9,
    finishPosition: 3,
    startPositionInClass: 3,
    finishPositionInClass: 3,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 93,
    clubPoints: 9,
    incidents: 6,
    lapsComplete: 22,
    lapsLed: 0,
    averageLap: 679594,
    bestLapTime: 673871,
    bestNlapsTime: 0,
    newIRating: 2485,
    oldIRating: 2447,
    newSafetyRating: 352,
    oldSafetyRating: 362,
    strengthOfField: 1982,
    numDrivers: 20,
    winnerName: 'Ion Circiu',
    winnerCustId: 909350,
  },
  // Race 29: Production Car @ Sonoma (P16)
  {
    subsessionId: 83214854,
    seasonId: 5898,
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    sessionStartTime: '2026-02-01T22:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 571,
    trackName: 'Sonoma Raceway - Sportscar Alt',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 22,
    finishPosition: 16,
    startPositionInClass: 16,
    finishPositionInClass: 16,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 113,
    clubPoints: 8,
    incidents: 2,
    lapsComplete: 14,
    lapsLed: 0,
    averageLap: 1042687,
    bestLapTime: 1032409,
    bestNlapsTime: 0,
    newIRating: 2560,
    oldIRating: 2485,
    newSafetyRating: 278,
    oldSafetyRating: 268,
    strengthOfField: 2084,
    numDrivers: 20,
    winnerName: 'Rob Reebok',
    winnerCustId: 1048796,
  },
  // Race 30: Pro 2 Lite Rookie @ Daytona (WIN!)
  {
    subsessionId: 83216263,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2026-02-01T23:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 471,
    trackName: 'Daytona Rallycross and Dirt Road - Dirt Road Short',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 4,
    finishPosition: 1,
    startPositionInClass: 1,
    finishPositionInClass: 1,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 94,
    clubPoints: 12,
    incidents: 0,
    lapsComplete: 6,
    lapsLed: 0,
    averageLap: 433072,
    bestLapTime: 398917,
    bestNlapsTime: 0,
    newIRating: 1733,
    oldIRating: 1658,
    newSafetyRating: 445,
    oldSafetyRating: 430,
    strengthOfField: 1989,
    numDrivers: 20,
    winnerName: 'Jason Davison',
    winnerCustId: 679948,
  },
  // Race 31: Pro 2 Lite Rookie @ Wild West (P3)
  {
    subsessionId: 83399064,
    seasonId: 6018,
    seriesId: 462,
    seriesName: 'Pro 2 Lite Off-Road Rookie Series by Trak Racer',
    sessionStartTime: '2026-02-08T21:00:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 332,
    trackName: 'Wild West Motorsports Park',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 6,
    finishPosition: 3,
    startPositionInClass: 3,
    finishPositionInClass: 3,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 68,
    clubPoints: 9,
    incidents: 2,
    lapsComplete: 6,
    lapsLed: 0,
    averageLap: 538988,
    bestLapTime: 528575,
    bestNlapsTime: 0,
    newIRating: 1762,
    oldIRating: 1733,
    newSafetyRating: 440,
    oldSafetyRating: 445,
    strengthOfField: 2162,
    numDrivers: 20,
    winnerName: 'Dustin Mccranie',
    winnerCustId: 910207,
  },
  // Race 32: SRF @ Barcelona (P3)
  {
    subsessionId: 83401363,
    seasonId: 5906,
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    sessionStartTime: '2026-02-08T22:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 349,
    trackName: 'Circuit de Barcelona Catalunya - Historic',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 3,
    finishPosition: 3,
    startPositionInClass: 3,
    finishPositionInClass: 3,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 66,
    clubPoints: 8,
    incidents: 4,
    lapsComplete: 12,
    lapsLed: 0,
    averageLap: 1192161,
    bestLapTime: 1174848,
    bestNlapsTime: 0,
    newIRating: 2566,
    oldIRating: 2560,
    newSafetyRating: 348,
    oldSafetyRating: 352,
    strengthOfField: 1748,
    numDrivers: 20,
    winnerName: 'Oliver Ramos',
    winnerCustId: 686851,
  },
  // Race 33: Production Car @ Summit Point (P33)
  {
    subsessionId: 83544806,
    seasonId: 5898,
    seriesId: 112,
    seriesName: 'Production Car Challenge by Sim-Lab',
    sessionStartTime: '2026-02-14T15:30:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 9,
    trackName: 'Summit Point Raceway',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 41,
    finishPosition: 33,
    startPositionInClass: 33,
    finishPositionInClass: 33,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 74,
    clubPoints: 5,
    incidents: 0,
    lapsComplete: 19,
    lapsLed: 0,
    averageLap: 765789,
    bestLapTime: 759840,
    bestNlapsTime: 0,
    newIRating: 2572,
    oldIRating: 2566,
    newSafetyRating: 292,
    oldSafetyRating: 278,
    strengthOfField: 2663,
    numDrivers: 20,
    winnerName: 'Elmar Erlekotte',
    winnerCustId: 30068,
  },
  // Race 34: SRF @ Chicago (WIN! from pole!)
  {
    subsessionId: 83552512,
    seasonId: 5906,
    seriesId: 63,
    seriesName: 'Spec Racer Ford Challenge',
    sessionStartTime: '2026-02-14T21:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 483,
    trackName: 'Chicago Street Course - 2023 Cup',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 1,
    finishPosition: 1,
    startPositionInClass: 1,
    finishPositionInClass: 1,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 78,
    clubPoints: 12,
    incidents: 0,
    lapsComplete: 15,
    lapsLed: 0,
    averageLap: 965645,
    bestLapTime: 951551,
    bestNlapsTime: 0,
    newIRating: 2605,
    oldIRating: 2572,
    newSafetyRating: 365,
    oldSafetyRating: 348,
    strengthOfField: 1646,
    numDrivers: 20,
    winnerName: 'Jason Davison',
    winnerCustId: 679948,
  },
  // Race 35: Ford Mustang GT4 @ Summit Point (P15)
  {
    subsessionId: 83573525,
    seasonId: 5900,
    seriesId: 530,
    seriesName: 'Ford Mustang Challenge by Skip Barber',
    sessionStartTime: '2026-02-15T16:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 9,
    trackName: 'Summit Point Raceway',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 1,
    finishPosition: 15,
    startPositionInClass: 15,
    finishPositionInClass: 15,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 23,
    clubPoints: 4,
    incidents: 1,
    lapsComplete: 12,
    lapsLed: 0,
    averageLap: 739440,
    bestLapTime: 733620,
    bestNlapsTime: 0,
    newIRating: 2524,
    oldIRating: 2605,
    newSafetyRating: 362,
    oldSafetyRating: 365,
    strengthOfField: 1810,
    numDrivers: 20,
    winnerName: 'Trenton McMillion',
    winnerCustId: 438537,
  },
  // Race 36: Ford Mustang GT4 @ Summit Point (P2, from pole)
  {
    subsessionId: 83581313,
    seasonId: 5900,
    seriesId: 530,
    seriesName: 'Ford Mustang Challenge by Skip Barber',
    sessionStartTime: '2026-02-15T22:45:00Z',
    eventType: 5,
    eventTypeName: 'Race',
    trackId: 9,
    trackName: 'Summit Point Raceway',
    trackCategoryId: 0,
    raceWeekNum: 0,
    startPosition: 1,
    finishPosition: 2,
    startPositionInClass: 2,
    finishPositionInClass: 2,
    carClassId: 0,
    carClassName: "",
    carClassShortName: "",
    carId: 0,
    carName: "",
    champPoints: 85,
    clubPoints: 10,
    incidents: 2,
    lapsComplete: 13,
    lapsLed: 0,
    averageLap: 739824,
    bestLapTime: 731231,
    bestNlapsTime: 0,
    newIRating: 2560,
    oldIRating: 2524,
    newSafetyRating: 358,
    oldSafetyRating: 362,
    strengthOfField: 1740,
    numDrivers: 20,
    winnerName: 'Blake Tovey',
    winnerCustId: 88966,
  },
];

// For convenience, all races sorted by date (most recent first)
export const mockAllRaces: RecentRace[] = [...mockRecentRaces].sort(
  (a, b) => new Date(b.sessionStartTime).getTime() - new Date(a.sessionStartTime).getTime()
);

// ============================================================================
// Mock Data Flag
// ============================================================================

// Set to true to use mock data, false to use real API
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get series summary stats from recent races
 */
export function getSeriesSummaryFromRaces(races: RecentRace[], seriesId: number) {
  const seriesRaces = races.filter((r) => r.seriesId === seriesId);
  if (seriesRaces.length === 0) return null;

  const finishPositions = seriesRaces.map((r) => r.finishPosition);
  const totalPoints = seriesRaces.reduce((sum, r) => sum + r.champPoints, 0);

  return {
    seriesId,
    seriesName: seriesRaces[0].seriesName,
    racesEntered: seriesRaces.length,
    avgFinish: Math.round((finishPositions.reduce((a, b) => a + b, 0) / finishPositions.length) * 10) / 10,
    totalPoints,
    bestFinish: Math.min(...finishPositions),
    worstFinish: Math.max(...finishPositions),
  };
}

/**
 * Get unique series from recent races
 */
export function getActiveSeriesFromRaces(races: RecentRace[]): Series[] {
  const seriesIds = [...new Set(races.map((r) => r.seriesId))];
  return mockSeries.filter((s) => seriesIds.includes(s.seriesId));
}

/**
 * Calculate virtual iRating per series
 * Uses the iRating at the first race as baseline, then tracks deltas
 */
export function calculateVirtualIRating(races: RecentRace[], seriesId: number) {
  const seriesRaces = races
    .filter((r) => r.seriesId === seriesId)
    .sort((a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime());

  if (seriesRaces.length === 0) return [];

  // Baseline is the iRating before the first race
  const baseline = seriesRaces[0].oldIRating;
  let runningTotal = baseline;

  // Calculate running iRating for each race
  const raceData = seriesRaces.map((race) => {
    const delta = race.newIRating - race.oldIRating;
    runningTotal += delta;
    return {
      date: race.sessionStartTime,
      weekNum: race.raceWeekNum,
      trackName: race.trackName || 'Unknown Track',
      virtualIRating: runningTotal,
      delta,
      baseline,
    };
  });

  // Aggregate by week - take the final iRating for each week
  const weekMap = new Map<number, typeof raceData[0]>();
  let weekDelta = 0;
  let prevWeekIRating = baseline;

  raceData.forEach((race) => {
    const existing = weekMap.get(race.weekNum);
    if (!existing || new Date(race.date) > new Date(existing.date)) {
      // Calculate cumulative delta for the week
      if (!existing) {
        weekDelta = race.virtualIRating - prevWeekIRating;
      } else {
        weekDelta = race.virtualIRating - prevWeekIRating;
      }
      weekMap.set(race.weekNum, {
        ...race,
        delta: weekDelta,
      });
    }
  });

  // Convert to array sorted by week, tracking cumulative delta per week
  const weeks = Array.from(weekMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([weekNum, data], index, arr) => {
      const prevIRating = index > 0 ? arr[index - 1][1].virtualIRating : baseline;
      return {
        ...data,
        weekNum,
        displayWeek: weekNum + 1, // Convert 0-indexed to 1-indexed for display
        delta: data.virtualIRating - prevIRating,
      };
    });

  return weeks;
}

/**
 * Get achievement stats per series
 */
export interface SeriesAchievements {
  seriesId: number;
  seriesName: string;
  poles: number;
  wins: number;
  podiums: number;
  top5s: number;
  racesStarted: number;
  winRate: number;
  podiumRate: number;
  avgFinish: number;
  avgIncidents: number;
  totalIncidents: number;
  cleanRaces: number;
}

export function getSeriesAchievements(races: RecentRace[]): SeriesAchievements[] {
  const seriesMap = new Map<number, RecentRace[]>();

  races.forEach((race) => {
    const existing = seriesMap.get(race.seriesId) || [];
    existing.push(race);
    seriesMap.set(race.seriesId, existing);
  });

  return Array.from(seriesMap.entries()).map(([seriesId, seriesRaces]) => {
    // Use in-class positions for multi-class race accuracy
    const poles = seriesRaces.filter((r) => r.startPositionInClass === 1).length;
    const wins = seriesRaces.filter((r) => r.finishPositionInClass === 1).length;
    const podiums = seriesRaces.filter((r) => r.finishPositionInClass <= 3).length;
    const top5s = seriesRaces.filter((r) => r.finishPositionInClass <= 5).length;
    const cleanRaces = seriesRaces.filter((r) => r.incidents === 0).length;
    const totalIncidents = seriesRaces.reduce((sum, r) => sum + r.incidents, 0);
    const avgFinish = seriesRaces.reduce((sum, r) => sum + r.finishPositionInClass, 0) / seriesRaces.length;

    return {
      seriesId,
      seriesName: seriesRaces[0].seriesName,
      poles,
      wins,
      podiums,
      top5s,
      racesStarted: seriesRaces.length,
      winRate: Math.round((wins / seriesRaces.length) * 100),
      podiumRate: Math.round((podiums / seriesRaces.length) * 100),
      avgFinish: Math.round(avgFinish * 10) / 10,
      avgIncidents: Math.round((totalIncidents / seriesRaces.length) * 10) / 10,
      totalIncidents,
      cleanRaces,
    };
  });
}

/**
 * Get incident data over time for all series
 */
export function getIncidentTrend(races: RecentRace[]) {
  return races
    .sort((a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime())
    .map((race) => ({
      date: race.sessionStartTime,
      seriesId: race.seriesId,
      seriesName: (race.seriesName || 'Unknown').split(' ').slice(0, 2).join(' '),
      incidents: race.incidents,
      trackName: race.trackName || 'Unknown Track',
    }));
}

/**
 * Get SoF distribution data
 */
export function getSoFDistribution(races: RecentRace[]) {
  const brackets = [
    { min: 0, max: 1500, label: '<1500' },
    { min: 1500, max: 1750, label: '1500-1750' },
    { min: 1750, max: 2000, label: '1750-2000' },
    { min: 2000, max: 2250, label: '2000-2250' },
    { min: 2250, max: 2500, label: '2250-2500' },
    { min: 2500, max: Infinity, label: '2500+' },
  ];

  return brackets.map((bracket) => {
    const racesInBracket = races.filter(
      (r) => r.strengthOfField >= bracket.min && r.strengthOfField < bracket.max
    );
    return {
      bracket: bracket.label,
      count: racesInBracket.length,
      avgFinish: racesInBracket.length > 0
        ? Math.round((racesInBracket.reduce((sum, r) => sum + r.finishPosition, 0) / racesInBracket.length) * 10) / 10
        : 0,
    };
  });
}

/**
 * Get average finish position trend over time
 */
export function getFinishPositionTrend(races: RecentRace[]) {
  const sorted = races
    .sort((a, b) => new Date(a.sessionStartTime).getTime() - new Date(b.sessionStartTime).getTime());

  // Calculate rolling average (last 5 races) using in-class position for multi-class races
  return sorted.map((race, index) => {
    const windowStart = Math.max(0, index - 4);
    const window = sorted.slice(windowStart, index + 1);
    const rollingAvg = window.reduce((sum, r) => sum + r.finishPositionInClass, 0) / window.length;

    return {
      date: race.sessionStartTime,
      seriesId: race.seriesId,
      seriesName: (race.seriesName || 'Unknown').split(' ').slice(0, 2).join(' '),
      finishPosition: race.finishPositionInClass,
      rollingAvg: Math.round(rollingAvg * 10) / 10,
      trackName: race.trackName || 'Unknown Track',
    };
  });
}

/**
 * Get championship points by series
 */
export interface SeriesChampionshipPoints {
  seriesId: number;
  seriesName: string;
  shortName: string;
  carClassName: string | null; // Class name for multi-class series
  totalPoints: number;
  countingPoints: number; // Sum of best 8 weeks
  racesEntered: number;
  weeksRaced: number;
  avgPointsPerRace: number;
}

export function getChampionshipPointsBySeries(races: RecentRace[]): SeriesChampionshipPoints[] {
  // Determine the active week - the most recent week with races in the last 7 days
  // Active week points are shown but don't count toward championship until week completes
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find max week number from recent races (within last week) - this is the active week
  let activeWeekNum = -1;
  races.forEach((race) => {
    const raceDate = new Date(race.sessionStartTime);
    if (raceDate > oneWeekAgo && race.raceWeekNum > activeWeekNum) {
      activeWeekNum = race.raceWeekNum;
    }
  });

  // Group by series + car CLASS to handle multi-class series
  // Use carClassId when available, fall back to carId for single-class series
  const seriesClassMap = new Map<string, RecentRace[]>();

  races.forEach((race) => {
    // Create a unique key - prefer carClassId, fall back to carId
    const classKey = race.carClassId || race.carId || 0;
    const key = `${race.seriesId}-${classKey}`;
    const existing = seriesClassMap.get(key) || [];
    existing.push(race);
    seriesClassMap.set(key, existing);
  });

  // Check which series have multiple classes/cars
  const seriesClassCount = new Map<number, Set<string>>();
  races.forEach((race) => {
    const classes = seriesClassCount.get(race.seriesId) || new Set();
    const classKey = race.carClassId || race.carId || 0;
    classes.add(String(classKey));
    seriesClassCount.set(race.seriesId, classes);
  });

  return Array.from(seriesClassMap.entries())
    .map(([key, seriesRaces]) => {
      const seriesId = seriesRaces[0].seriesId;
      const carClassName = seriesRaces[0].carClassName || seriesRaces[0].carClassShortName || seriesRaces[0].carName;
      const baseSeriesName = seriesRaces[0].seriesName;
      const hasMultipleClasses = (seriesClassCount.get(seriesId)?.size || 0) > 1;

      // Group races by week number and get best result per week
      const weeklyBest = new Map<number, number>();
      seriesRaces.forEach((race) => {
        const weekNum = race.raceWeekNum;
        const currentBest = weeklyBest.get(weekNum);
        if (!currentBest || race.champPoints > currentBest) {
          weeklyBest.set(weekNum, race.champPoints);
        }
      });

      // Sum all weekly best points (total possible, including active week)
      const totalPoints = Array.from(weeklyBest.values()).reduce((sum, pts) => sum + pts, 0);

      // For counting points, exclude the active week (matches Series Detail behavior)
      // Only completed weeks count toward championship
      const completedWeeklyPoints: number[] = [];
      weeklyBest.forEach((points, weekNum) => {
        if (weekNum !== activeWeekNum) {
          completedWeeklyPoints.push(points);
        }
      });

      // Get best 8 completed weeks for counting points (championship scoring)
      const sortedCompletedPoints = completedWeeklyPoints.sort((a, b) => b - a);
      const countingPoints = sortedCompletedPoints.slice(0, 8).reduce((sum, pts) => sum + pts, 0);

      return {
        seriesId,
        seriesName: baseSeriesName,
        shortName: formatSeriesShortName(baseSeriesName),
        carClassName: hasMultipleClasses ? carClassName : null,
        totalPoints,
        countingPoints,
        racesEntered: seriesRaces.length,
        weeksRaced: weeklyBest.size,
        avgPointsPerRace: Math.round(totalPoints / seriesRaces.length),
      };
    })
    .sort((a, b) => b.countingPoints - a.countingPoints); // Sort by counting points descending
}

function formatSeriesShortName(name: string): string {
  if (!name) return 'Unknown';

  // Remove common prefixes/suffixes that make names longer
  let shortName = name
    .replace(/iRacing /gi, '')
    .replace(/ Series$/gi, '')
    .replace(/ Challenge$/gi, '')
    .replace(/ Championship$/gi, '')
    .replace(/ Rookie$/gi, ' (R)')
    .replace(/ Fixed$/gi, ' (F)')
    .trim();

  // If still too long, take first 3 words
  const words = shortName.split(' ');
  if (words.length > 3) {
    shortName = words.slice(0, 3).join(' ');
  }

  return shortName;
}
