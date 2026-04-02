"use client";

import { useEffect, useRef, useState } from "react";

interface LocationTrackerProps {
  onLocationUpdate?: (location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  }) => void;
}

export function LocationTracker({ onLocationUpdate }: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setIsTracking(true);
    setError(null);

    // Send location every 60 seconds
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, heading, speed } =
          position.coords;

        setLocation(position.coords);

        const locationData = {
          latitude,
          longitude,
          accuracy: accuracy || undefined,
          heading: heading || undefined,
          speed: speed || undefined,
        };

        try {
          await fetch("/api/cleaner/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(locationData),
          });

          onLocationUpdate?.(locationData);
        } catch (err) {
          console.error("Failed to send location:", err);
        }
      },
      (err) => {
        setError(
          err.message || "Failed to get location. Please enable location access."
        );
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {isTracking ? (
          <>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
              <span className="w-2 h-2 bg-green-700 rounded-full animate-pulse" />
              Tracking Active
            </span>
            <button
              onClick={stopTracking}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Stop Tracking
            </button>
          </>
        ) : (
          <button
            onClick={startTracking}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Start Tracking
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {location && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
          <div>Latitude: {location.latitude.toFixed(6)}</div>
          <div>Longitude: {location.longitude.toFixed(6)}</div>
          {location.accuracy && (
            <div>Accuracy: {location.accuracy.toFixed(2)}m</div>
          )}
          {location.heading && (
            <div>Heading: {location.heading.toFixed(1)}°</div>
          )}
          {location.speed && (
            <div>Speed: {(location.speed * 3.6).toFixed(1)} km/h</div>
          )}
        </div>
      )}
    </div>
  );
}
