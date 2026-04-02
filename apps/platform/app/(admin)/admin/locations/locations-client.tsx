"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  recordedAt: string;
}

interface CleanerLocationData {
  cleanerId: string;
  locations: LocationData[];
}

export default function LocationsClient({
  initialData,
}: {
  initialData: CleanerLocationData[];
}) {
  const [data, setData] = useState<CleanerLocationData[]>(initialData);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/locations");
        if (response.ok) {
          const newData = await response.json();
          setData(newData);
          setError(null);
        } else {
          setError("Failed to refresh locations");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to refresh locations");
      } finally {
        setLoading(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border"
            disabled={loading}
          />
          <span className="text-sm">Auto-refresh (30s) {loading && "..."}</span>
        </label>
      </div>

      {data.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No location data available.
        </p>
      ) : (
        <div className="grid gap-4">
          {data.map((cleaner) => {
            const lastLocation = cleaner.locations[0];
            return (
              <Card key={cleaner.cleanerId}>
                <CardHeader>
                  <h3 className="font-semibold">
                    Cleaner {cleaner.cleanerId.substring(0, 8)}
                  </h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lastLocation ? (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Latitude</p>
                          <p className="font-mono">
                            {lastLocation.latitude.toFixed(6)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Longitude</p>
                          <p className="font-mono">
                            {lastLocation.longitude.toFixed(6)}
                          </p>
                        </div>
                        {lastLocation.accuracy !== null && (
                          <div>
                            <p className="text-muted-foreground">Accuracy</p>
                            <p className="font-mono">
                              {lastLocation.accuracy.toFixed(1)}m
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Last Update</p>
                          <p className="font-mono">
                            {new Date(lastLocation.recordedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No location data
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
