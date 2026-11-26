export type Sex = "male" | "female";

export type Goal = "fitness" | "5k" | "10k" | "half" | "marathon";

/** Dystans startu biegowego (bez ogólnej sprawności). */
export type RaceDistance = Exclude<Goal, "fitness">;

export interface Profile {
  age: number;
  sex: Sex;
  maxHr: number;
  restHr: number;
  goal: Goal;
  daysPerWeek: number;
  /** YYYY-MM-DD — do tego dnia włącznie tryb deload (tylko easy/recovery/rest) */
  deloadUntil?: string;
  /** opcjonalna lokalizacja do pogody (z ostatniej aktywności z GPS) */
  lastLat?: number;
  lastLon?: number;
}

/** Subiektywna ocena wysiłku po aktywności (osobno od sync Garmin). */
export interface RunFeedback {
  rpe?: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export type TrackPoint = { lat: number; lon: number };

export interface RaceEvent {
  id: string;
  name: string;
  /** ISO date YYYY-MM-DD (dzień startu, lokalnie) */
  date: string;
  distance: RaceDistance;
  /** opcjonalny cel czasowy w sekundach */
  targetTimeS?: number;
  notes?: string;
  /** gdy true — trener przygotowuje pod ten start (max jeden aktywny) */
  prepareForIt: boolean;
}

export type RunSource = "fit" | "garmin" | "demo";

export type ActivitySport = "running" | "walking" | "cycling";

export interface BestEfforts {
  /** najlepszy czas (s) na dystansie, klucz = dystans w metrach */
  [distanceM: string]: number;
}

export interface RunSummary {
  id: string;
  source: RunSource;
  /** Domyślnie running dla starszych zapisów bez pola. */
  sport?: ActivitySport;
  name?: string;
  startTime: string;
  distanceM: number;
  durationS: number;
  avgHr?: number;
  maxHr?: number;
  /** średnia prędkość w ruchu (m/s) */
  avgSpeed: number;
  /** kadencja w krokach/min (obie nogi) */
  avgCadence?: number;
  ascentM?: number;
  /** dryf tętna względem tempa (Pa:HR), % */
  decouplingPct?: number;
  /** sekundy spędzone na danym tętnie, klucz = bpm */
  hrHist?: Record<string, number>;
  best?: BestEfforts;
  /** rzadka trasa GPS (do mapy), max ~80 punktów */
  track?: TrackPoint[];
}

export type WorkoutType =
  | "rest"
  | "recovery"
  | "easy"
  | "long"
  | "tempo"
  | "cruise"
  | "intervals"
  | "fartlek"
  | "speed"
  | "progression"
  | "marathon"
  | "first";

export type StepKind = "warmup" | "work" | "recovery" | "cooldown" | "easy";

export interface WorkoutStep {
  kind: StepKind;
  label: string;
  durationS?: number;
  distanceM?: number;
  /** szybsza granica tempa, s/km */
  paceFast?: number;
  /** wolniejsza granica tempa, s/km */
  paceSlow?: number;
  hrLow?: number;
  hrHigh?: number;
  note?: string;
}

export type WorkoutBlock =
  | { type: "step"; step: WorkoutStep }
  | { type: "repeat"; count: number; steps: WorkoutStep[] };

export interface Workout {
  type: WorkoutType;
  title: string;
  summary: string;
  rationale: string[];
  blocks: WorkoutBlock[];
  totalS: number;
  totalM: number;
}

export interface VdotPaces {
  vdot: number;
  easy: [number, number];
  marathon: [number, number];
  threshold: [number, number];
  interval: [number, number];
  repetition: [number, number];
}
