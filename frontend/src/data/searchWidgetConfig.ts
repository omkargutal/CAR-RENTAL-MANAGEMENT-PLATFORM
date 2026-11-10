// Configuration and persistence for Homepage Search Widget quick-select hubs and airport terminals

export interface AirportTerminalOption {
  code: string;
  name: string;
}

export const DEFAULT_POPULAR_DESTINATIONS: string[] = [
  "Pune",
  "Mumbai",
  "Mahabaleshwar",
  "Trimbakeshwar Jyotirling",
  "Ellora Caves",
];

export const DEFAULT_AIRPORT_TERMINALS: AirportTerminalOption[] = [
  { code: "PNQ", name: "Pune International Airport (PNQ)" },
  { code: "CSMIA", name: "Chhatrapati Shivaji Maharaj International Airport (CSMIA)" },
  { code: "NMIA", name: "Navi Mumbai International Airport (NMIA)" },
];

const POPULAR_STORAGE_KEY = "autofleet_popular_destinations";
const AIRPORTS_STORAGE_KEY = "autofleet_airport_terminals";
export const SEARCH_CONFIG_EVENT = "autofleet_search_config_updated";

export function getStoredPopularDestinations(): string[] {
  try {
    const raw = localStorage.getItem(POPULAR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn("Failed to load stored popular destinations, using defaults:", err);
  }
  return [...DEFAULT_POPULAR_DESTINATIONS];
}

export function saveStoredPopularDestinations(list: string[]): void {
  try {
    const cleanList = list.map((item) => item.trim()).filter(Boolean);
    localStorage.setItem(POPULAR_STORAGE_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(new CustomEvent(SEARCH_CONFIG_EVENT));
  } catch (err) {
    console.error("Failed to save popular destinations:", err);
  }
}

export function getStoredAirportTerminals(): AirportTerminalOption[] {
  try {
    const raw = localStorage.getItem(AIRPORTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load stored airport terminals, using defaults:", err);
  }
  return [...DEFAULT_AIRPORT_TERMINALS];
}

export function saveStoredAirportTerminals(list: AirportTerminalOption[]): void {
  try {
    localStorage.setItem(AIRPORTS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(SEARCH_CONFIG_EVENT));
  } catch (err) {
    console.error("Failed to save airport terminals:", err);
  }
}

export function resetSearchWidgetDefaults(): void {
  try {
    localStorage.removeItem(POPULAR_STORAGE_KEY);
    localStorage.removeItem(AIRPORTS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(SEARCH_CONFIG_EVENT));
  } catch (err) {
    console.error("Failed to reset search widget defaults:", err);
  }
}
