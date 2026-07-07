"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import { AppNavbar } from "@/components/AppNavbar";
import { AppFooter } from "@/components/AppFooter";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { FooterConfigProvider } from "@/components/footer-config";
import { NavbarConfigProvider } from "@/components/navbar-config";
import { UploadModal } from "@/components/UploadModal";
import { GALLERY_REFRESH_EVENT, refreshGallery } from "@/lib/gallery-admin";
import { invalidateMapData, prefetchMapData } from "@/lib/map-data-cache";
import { invalidateGalleryListCaches } from "@/lib/gallery-lists-cache";
import { invalidateTripsCache, loadTrips, getCachedTrips } from "@/lib/trips-data-cache";
import { isFavoritesTrip } from "@/lib/favorites-trip";
import type { Trip } from "@/lib/types";

type UploadControlContextValue = {
  openUpload: (defaultTrip?: string) => void;
};

const UploadControlContext = createContext<UploadControlContextValue>({
  openUpload: () => {},
});

export function useUploadModal() {
  return useContext(UploadControlContext);
};

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [defaultTrip, setDefaultTrip] = useState("");
  const [trips, setTrips] = useState<Trip[]>(() => getCachedTrips() ?? []);
  const { isAdmin } = useAuth();

  const fetchTrips = useCallback(async () => {
    try {
      const data = await loadTrips();
      setTrips(data);
    } catch {
      // non-critical
    }
  }, []);

  const openUpload = useCallback((tripName = "") => {
    setDefaultTrip(tripName);
    setShowUpload(true);
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    const refresh = () => {
      fetchTrips();
    };
    window.addEventListener(GALLERY_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(GALLERY_REFRESH_EVENT, refresh);
  }, [fetchTrips]);

  return (
    <NavbarConfigProvider>
      <FooterConfigProvider>
        <ConfirmProvider>
        <UploadControlContext.Provider value={{ openUpload }}>
          <AppNavbar onUpload={isAdmin ? () => openUpload() : undefined} />
          {children}
          <AppFooter />

          {showUpload && isAdmin && (
          <UploadModal
            trips={trips.filter((trip) => !isFavoritesTrip(trip.name))}
            defaultTrip={defaultTrip}
            onClose={() => {
              setShowUpload(false);
              setDefaultTrip("");
            }}
            onUploadComplete={() => {
              invalidateTripsCache();
              invalidateGalleryListCaches();
              invalidateMapData();
              fetchTrips();
              refreshGallery();
              prefetchMapData();
            }}
          />
        )}
        </UploadControlContext.Provider>
        </ConfirmProvider>
      </FooterConfigProvider>
    </NavbarConfigProvider>
  );
}
