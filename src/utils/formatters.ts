/**
 * Geospatial and location formatting utilities for EarthPulse
 */

export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Formats a location as: <Location Name> (<latitude>, <longitude>)
 * Example: Phoenix, Arizona, USA (33.4484° N, 112.0740° W)
 */
export function formatLocationDisplay(name: string, lat: number, lng: number): string {
  const coords = formatCoordinates(lat, lng);
  if (!name || name.trim() === '') {
    return `Location (${coords})`;
  }
  const trimmed = name.trim();
  // Avoid duplicate coordinate brackets if name already contains them
  if (
    trimmed.includes('(') &&
    (trimmed.includes('° N') ||
      trimmed.includes('° S') ||
      trimmed.includes('° E') ||
      trimmed.includes('° W') ||
      trimmed.includes('°,'))
  ) {
    return trimmed;
  }
  return `${trimmed} (${coords})`;
}
