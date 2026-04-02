/**
 * Route Optimization Library
 * Calculates distances between coordinates and optimizes job routes using nearest-neighbor TSP
 */

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface OptimizedJob {
  id: string;
  sequence: number;
  location: Coordinate;
  estimatedDriveTimeMinutes: number;
  cumulativeDistanceMiles: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 * Validates coordinates and handles edge cases
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Validate all inputs are valid numbers
  if (typeof lat1 !== "number" || !isFinite(lat1) || lat1 < -90 || lat1 > 90) {
    throw new Error(`Invalid latitude: ${lat1}`);
  }
  if (typeof lng1 !== "number" || !isFinite(lng1) || lng1 < -180 || lng1 > 180) {
    throw new Error(`Invalid longitude: ${lng1}`);
  }
  if (typeof lat2 !== "number" || !isFinite(lat2) || lat2 < -90 || lat2 > 90) {
    throw new Error(`Invalid latitude: ${lat2}`);
  }
  if (typeof lng2 !== "number" || !isFinite(lng2) || lng2 < -180 || lng2 > 180) {
    throw new Error(`Invalid longitude: ${lng2}`);
  }

  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const sinDLatHalf = Math.sin(dLat / 2);
  const sinDLngHalf = Math.sin(dLng / 2);
  const cosLat1 = Math.cos((lat1 * Math.PI) / 180);
  const cosLat2 = Math.cos((lat2 * Math.PI) / 180);

  const a =
    sinDLatHalf * sinDLatHalf +
    cosLat1 * cosLat2 * sinDLngHalf * sinDLngHalf;

  // Clamp 'a' to [0, 1] to avoid NaN in sqrt
  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  const distance = R * c;

  // Validate result
  if (!isFinite(distance) || distance < 0) {
    throw new Error("Distance calculation resulted in invalid value");
  }

  return distance;
}

/**
 * Estimate drive time in minutes based on distance
 * Assumes average speed of 30 mph in urban areas, 45 mph on highways
 * Conservative estimate: 25 mph average
 */
export function estimateDriveTime(distanceMiles: number): number {
  const speedMph = 25;
  return Math.round((distanceMiles / speedMph) * 60);
}

/**
 * Validate coordinate object
 */
function isValidCoordinate(coord: any): boolean {
  return (
    coord &&
    typeof coord === "object" &&
    typeof coord.lat === "number" &&
    typeof coord.lng === "number" &&
    isFinite(coord.lat) &&
    isFinite(coord.lng) &&
    coord.lat >= -90 &&
    coord.lat <= 90 &&
    coord.lng >= -180 &&
    coord.lng <= 180
  );
}

/**
 * Optimize route using nearest-neighbor TSP algorithm
 * Starts from the first job and always goes to the nearest unvisited job
 * Returns jobs ordered with sequence numbers and estimated drive times
 */
export function optimizeRoute(
  jobs: Array<{
    id: string;
    location: Coordinate;
  }>
): OptimizedJob[] {
  // Validate input
  if (!Array.isArray(jobs)) {
    throw new Error("Jobs must be an array");
  }

  if (jobs.length === 0) return [];

  // Validate all jobs have valid coordinates
  for (let i = 0; i < jobs.length; i++) {
    if (!jobs[i] || !jobs[i].id || typeof jobs[i].id !== "string") {
      throw new Error(`Invalid job at index ${i}: missing or invalid id`);
    }
    if (!isValidCoordinate(jobs[i].location)) {
      throw new Error(
        `Invalid coordinates for job ${jobs[i].id}: lat=${jobs[i].location?.lat}, lng=${jobs[i].location?.lng}`
      );
    }
  }

  if (jobs.length === 1) {
    return [
      {
        id: jobs[0].id,
        sequence: 1,
        location: jobs[0].location,
        estimatedDriveTimeMinutes: 0,
        cumulativeDistanceMiles: 0,
      },
    ];
  }

  const visited = new Set<string>();
  const ordered: OptimizedJob[] = [];
  let currentLocation = jobs[0].location;
  let totalDistance = 0;

  // Start with first job
  visited.add(jobs[0].id);
  ordered.push({
    id: jobs[0].id,
    sequence: 1,
    location: jobs[0].location,
    estimatedDriveTimeMinutes: 0,
    cumulativeDistanceMiles: 0,
  });

  // Nearest neighbor algorithm
  while (visited.size < jobs.length) {
    let nearestJob = null;
    let nearestDistance = Infinity;

    for (const job of jobs) {
      if (visited.has(job.id)) continue;

      try {
        const distance = haversineDistance(
          currentLocation.lat,
          currentLocation.lng,
          job.location.lat,
          job.location.lng
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestJob = job;
        }
      } catch (err) {
        console.error(`Failed to calculate distance for job ${job.id}:`, err);
        // Skip this job and continue
        continue;
      }
    }

    if (nearestJob && isFinite(nearestDistance)) {
      visited.add(nearestJob.id);
      totalDistance += nearestDistance;

      // Validate total distance doesn't overflow
      if (!isFinite(totalDistance)) {
        throw new Error("Total distance calculation resulted in invalid value");
      }

      const driveTime = estimateDriveTime(nearestDistance);

      ordered.push({
        id: nearestJob.id,
        sequence: ordered.length + 1,
        location: nearestJob.location,
        estimatedDriveTimeMinutes: driveTime,
        cumulativeDistanceMiles: totalDistance,
      });

      currentLocation = nearestJob.location;
    } else if (!nearestJob) {
      // This shouldn't happen if validation is correct, but handle it gracefully
      console.warn("No nearest job found - stopping optimization");
      break;
    }
  }

  return ordered;
}
