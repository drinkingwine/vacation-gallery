"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FooterConfig = {
  stats?: string;
};

type FooterConfigContextValue = {
  config: FooterConfig;
  setConfig: (config: FooterConfig) => void;
};

const FooterConfigContext = createContext<FooterConfigContextValue | null>(null);

export function FooterConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<FooterConfig>({});
  const value = useMemo(() => ({ config, setConfig }), [config]);

  return (
    <FooterConfigContext.Provider value={value}>
      {children}
    </FooterConfigContext.Provider>
  );
}

export function useFooterConfig(config: FooterConfig) {
  const context = useContext(FooterConfigContext);
  if (!context) {
    throw new Error("useFooterConfig must be used within FooterConfigProvider");
  }

  const { setConfig } = context;

  useEffect(() => {
    setConfig(config);
    return () => setConfig({});
  }, [config.stats, setConfig]);
}

export function useFooterConfigState() {
  const context = useContext(FooterConfigContext);
  if (!context) {
    throw new Error("useFooterConfigState must be used within FooterConfigProvider");
  }

  return context.config;
}
