// The live San Francisco sky: works out where the sun is over SF right now.
// No internet needed: it's the same astronomy math almanacs use, accurate to a few minutes.

const SF_LATITUDE = 37.7749;
const SF_LONGITUDE = -122.4194;
const DEG = Math.PI / 180; // turns degrees into the units Math.sin/cos use

// How high the sun is over San Francisco at a given moment, in degrees.
// Positive = above the horizon, negative = below.
export function sunHeight(date) {
  const days = date.getTime() / 86400000 + 2440587.5 - 2451545.0; // days since Jan 1, 2000
  const meanAnomaly = (357.529 + 0.98560028 * days) % 360;
  const meanLongitude = (280.459 + 0.98564736 * days) % 360;
  const sunLongitude = meanLongitude + 1.915 * Math.sin(meanAnomaly * DEG) + 0.02 * Math.sin(2 * meanAnomaly * DEG);
  const tilt = 23.439 - 0.00000036 * days; // Earth's tilt
  const rightAscension = Math.atan2(Math.cos(tilt * DEG) * Math.sin(sunLongitude * DEG), Math.cos(sunLongitude * DEG)) / DEG;
  const declination = Math.asin(Math.sin(tilt * DEG) * Math.sin(sunLongitude * DEG)) / DEG;
  const siderealTime = (18.697374558 + 24.06570982441908 * days) % 24;
  const hourAngle = (siderealTime * 15 + SF_LONGITUDE - rightAscension) * DEG;
  return (
    Math.asin(
      Math.sin(SF_LATITUDE * DEG) * Math.sin(declination * DEG) +
        Math.cos(SF_LATITUDE * DEG) * Math.cos(declination * DEG) * Math.cos(hourAngle)
    ) / DEG
  );
}

// The next sunrise and sunset after `now`. Checks every 2 minutes for the next 36 hours.
// (Sunrise/sunset = when the top edge of the sun crosses the horizon: -0.833 degrees.)
function nextSunriseAndSunset(now) {
  const result = {};
  let before = sunHeight(now) + 0.833;
  for (let i = 1; i <= 1080 && !(result.sunrise && result.sunset); i++) {
    const time = new Date(now.getTime() + i * 120000);
    const after = sunHeight(time) + 0.833;
    if (before > 0 && after <= 0 && !result.sunset) result.sunset = time;
    if (before <= 0 && after > 0 && !result.sunrise) result.sunrise = time;
    before = after;
  }
  return result;
}

// A time shown in San Francisco's time zone, like "7:09 PM".
function sfTime(date) {
  return date.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
}

// Everything the page needs to know about the sky over SF right now.
export function getLiveSky(now = new Date()) {
  const height = sunHeight(now);
  const { sunrise, sunset } = nextSunriseAndSunset(now);
  const sunIsUp = height > -0.833;

  // 0 while the sun is up, then blends to 1 as the sun sinks 8 degrees below the horizon (twilight).
  const x = Math.min(1, Math.max(0, (0.5 - height) / 8.5));
  const night = x * x * (3 - 2 * x);

  const next = sunIsUp ? (sunset ? `Sunset ${sfTime(sunset)}` : "") : sunrise ? `Sunrise ${sfTime(sunrise)}` : "";
  return {
    night,
    isNight: night > 0.5,
    text: `Live from San Francisco · Local time ${sfTime(now)}${next ? ` · ${next}` : ""}`,
    shortText: `Live from SF · ${sfTime(now)}`,
  };
}
