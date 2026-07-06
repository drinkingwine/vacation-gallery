"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type NavbarConfig = {
  backHref?: string;
  backLabel?: string;
};

type NavbarConfigContextValue = {
  config: NavbarConfig;
  setConfig: (config: NavbarConfig) => void;
};

const NavbarConfigContext = createContext<NavbarConfigContextValue | null>(null);

export function NavbarConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<NavbarConfig>({});
  const value = useMemo(() => ({ config, setConfig }), [config]);

  return (
    <NavbarConfigContext.Provider value={value}>
      {children}
    </NavbarConfigContext.Provider>
  );
}

export function useNavbarConfig(config: NavbarConfig) {
  const context = useContext(NavbarConfigContext);
  if (!context) {
    throw new Error("useNavbarConfig must be used within NavbarConfigProvider");
  }

  const { setConfig } = context;

  useEffect(() => {
    setConfig(config);
    return () => setConfig({});
  }, [config.backHref, config.backLabel, setConfig]);
}

export function useNavbarConfigState() {
  const context = useContext(NavbarConfigContext);
  if (!context) {
    throw new Error("useNavbarConfigState must be used within NavbarConfigProvider");
  }

  return context.config;
}
