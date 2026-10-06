"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface LocationSelection {
  kind: "all" | "city" | "nearby";
  city?: string;
  lat?: number;
  lng?: number;
}

export type NearbyStatus = "idle" | "locating" | "error";

interface LocationContextValue {
  location: LocationSelection;
  setLocation: (loc: LocationSelection) => void;
  nearbyStatus: NearbyStatus;
  requestNearby: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationSelection>({ kind: "all" });
  const [nearbyStatus, setNearbyStatus] = useState<NearbyStatus>("idle");

  const requestNearby = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setNearbyStatus("error");
      return;
    }
    setNearbyStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearbyStatus("idle");
        setLocation({
          kind: "nearby",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setNearbyStatus("error"),
      { timeout: 10000 },
    );
  }, []);

  const value = useMemo(
    () => ({ location, setLocation, nearbyStatus, requestNearby }),
    [location, nearbyStatus, requestNearby],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used inside LocationProvider");
  return ctx;
}

/** Short label for the header button and pickers. */
export function locationLabel(loc: LocationSelection): string {
  if (loc.kind === "city") return loc.city ?? "";
  if (loc.kind === "nearby") return "Near me";
  return "Nigeria";
}
