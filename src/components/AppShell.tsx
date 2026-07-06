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
import { FooterConfigProvider } from "@/components/footer-config";
import { NavbarConfigProvider } from "@/components/navbar-config";
import { UploadModal } from "@/components/UploadModal";
import { GALLERY_REFRESH_EVENT, refreshGallery } from "@/lib/gallery-admin";
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
  const [trips, setTrips] = useState<Trip[]>([]);
  const { isAdmin } = useAuth();

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch("/api/trips");
      if (res.ok) setTrips(await res.json());
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
              fetchTrips();
              refreshGallery();
            }}
          />
        )}
        </UploadControlContext.Provider>
      </FooterConfigProvider>
    </NavbarConfigProvider>
  );
}
