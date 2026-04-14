/**
 * Opponent encounter tracking — localStorage-backed.
 *
 * Storage key is per-driver (`iracing-v3-ng-opponents-{custId}`) so that
 * switching drivers shows the correct opponent list for each account.
 * This is separate from the HTML file's `iracing-v3-opponents` key.
 */

function oppKey(custId: number): string {
  return `iracing-v3-ng-opponents-${custId}`;
}

export interface Opponent {
  iracingId: string;
  name: string;
  encounters: Encounter[];
  tags: string[];
  notes: string;
  peakIR: number;
  currentIR: number;
}

export interface Encounter {
  raceId: string;
  date: string; // YYYY-MM-DD
  track: string;
  seriesName: string;
  carName: string;
  category: string; // formula | road | oval | dirt_oval | dirt_road
  sof: number;
  pos: number; // 1-indexed finish position
  startPos: number; // 1-indexed start position
  inc: number;
  iRBefore: number;
  iRAfter: number;
  fl: string; // formatted lap time string, empty if unavailable
  status: string; // reason_out or "Running"
}

export function getOpponents(custId: number): Opponent[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(oppKey(custId)) || '[]');
  } catch {
    return [];
  }
}

function saveOpponents(custId: number, opponents: Opponent[]): void {
  localStorage.setItem(oppKey(custId), JSON.stringify(opponents));
}

export function clearOpponents(custId: number): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(oppKey(custId));
}

export type OpponentTag = 'rival' | 'friendly' | 'blocker';

/** Return the active tag for an opponent, or null if untagged. */
export function getOpponentTag(opponent: Opponent): OpponentTag | null {
  const t = opponent.tags?.[0];
  if (t === 'rival' || t === 'friendly' || t === 'blocker') return t;
  return null;
}

/**
 * Set or clear the tag for one opponent. Writes back to localStorage immediately.
 * Pass null to remove the tag.
 */
export function setOpponentTag(custId: number, iracingId: string, tag: OpponentTag | null): void {
  if (typeof window === 'undefined') return;
  const opponents = getOpponents(custId);
  const updated = opponents.map((d) =>
    d.iracingId === iracingId ? { ...d, tags: tag ? [tag] : [] } : d
  );
  saveOpponents(custId, updated);
}

function formatLapStr(hundredths: number): string {
  if (!hundredths || hundredths <= 0) return '';
  const totalSeconds = hundredths / 100;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
  return seconds.toFixed(3);
}

// Raw driver row as returned by the subsession API (snake_case)
export interface ApiDriverRow {
  cust_id?: number;
  display_name?: string;
  finish_position?: number; // 0-indexed
  starting_position?: number; // 0-indexed
  incidents?: number;
  oldi_rating?: number;
  old_irating?: number;
  newi_rating?: number;
  new_irating?: number;
  best_lap_time?: number;
  average_lap?: number;
  reason_out?: string;
}

/**
 * Merge a full driver grid from one subsession into the stored opponent list
 * for the given driver (myCustId). Safe to call on the client only.
 */
export function mergeDriverGrid(
  subsessionId: number,
  race: {
    date: string;
    trackName: string;
    seriesName: string;
    carName: string;
    category: string;
    sof: number;
  },
  driverRows: ApiDriverRow[],
  myCustId: number
): void {
  if (typeof window === 'undefined') return;

  const existing = getOpponents(myCustId);
  const map: Record<string, Opponent> = {};
  existing.forEach((d) => {
    map[d.iracingId] = d;
  });
  const raceId = String(subsessionId);

  driverRows.forEach((row) => {
    const custId = String(row.cust_id ?? '');
    if (!custId || custId === '0') return;
    if (custId === String(myCustId)) return; // never include self
    const name = row.display_name ?? '';
    if (!name) return;

    const finPos = (row.finish_position ?? 0) + 1;
    const startPos = (row.starting_position ?? 0) + 1;
    const inc = row.incidents ?? 0;
    const iRBefore = row.oldi_rating ?? row.old_irating ?? 0;
    const iRAfter = row.newi_rating ?? row.new_irating ?? 0;
    const fl = formatLapStr(row.best_lap_time ?? 0);
    const status = row.reason_out ?? 'Running';

    if (!map[custId]) {
      map[custId] = {
        iracingId: custId,
        name,
        encounters: [],
        tags: [],
        notes: '',
        peakIR: iRBefore,
        currentIR: iRAfter,
      };
    }

    const d = map[custId];

    if (!d.encounters.find((e) => e.raceId === raceId)) {
      d.encounters.push({
        raceId,
        date: race.date,
        track: race.trackName,
        seriesName: race.seriesName,
        carName: race.carName,
        category: race.category,
        sof: race.sof,
        pos: finPos,
        startPos,
        inc,
        iRBefore,
        iRAfter,
        fl,
        status,
      });
    }

    d.peakIR = Math.max(d.peakIR ?? 0, iRBefore, iRAfter);
    if (iRAfter > 0) d.currentIR = iRAfter;
    if (name && name !== d.name) d.name = name;
  });

  saveOpponents(myCustId, Object.values(map));
}
