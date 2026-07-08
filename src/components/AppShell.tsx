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
import { GALLERY_HOME_READY_EVENT, GALLERY_REFRESH_EVENT, refreshGallery } from "@/lib/gallery-admin";
import { invalidateMapData, prefetchMapData } from "@/lib/map-data-cache";
import {
  getCachedTrips,
  invalidateGalleryHomeCache,
  loadGalleryHome,
} from "@/lib/gallery-home-cache";
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

  const syncTripsFromCache = useCallback(() => {
    setTrips(getCachedTrips() ?? []);
  }, []);

  const fetchGalleryHome = useCallback(async () => {
    try {
      const data = await loadGalleryHome();
      setTrips(data.trips);
    } catch {
      // non-critical
    }
  }, []);

  const openUpload = useCallback((tripName = "") => {
    setDefaultTrip(tripName);
    setShowUpload(true);
    void fetchGalleryHome();
  }, [fetchGalleryHome]);

  useEffect(() => {
    void fetchGalleryHome();
  }, [fetchGalleryHome]);

  useEffect(() => {
    syncTripsFromCache();
    window.addEventListener(GALLERY_HOME_READY_EVENT, syncTripsFromCache);
    return () =>
      window.removeEventListener(GALLERY_HOME_READY_EVENT, syncTripsFromCache);
  }, [syncTripsFromCache]);

  useEffect(() => {
    const refresh = () => {
      invalidateGalleryHomeCache();
      void fetchGalleryHome();
    };
    window.addEventListener(GALLERY_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(GALLERY_REFRESH_EVENT, refresh);
  }, [fetchGalleryHome]);

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
              invalidateGalleryHomeCache();
              invalidateMapData();
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
