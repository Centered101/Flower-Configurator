"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fetchConfiguratorCatalog, getDefaultConfiguratorCatalog, hasConfiguratorCatalogData, readAdminConfiguratorCatalog, type ConfiguratorCatalog } from "@/lib/configurator-catalog";
import { createConfigPatch, defaultConfig, STORAGE_KEY, updateConfigPrice } from "@/lib/configurator";
import type { ConfiguratorState } from "@/lib/types";

type ConfiguratorContextValue = {
  config: ConfiguratorState;
  catalog: ConfiguratorCatalog;
  isReady: boolean;
  setConfig: (patch: Partial<ConfiguratorState>) => void;
  replaceConfig: (config: ConfiguratorState) => void;
  resetConfig: () => void;
};

const ConfiguratorContext = createContext<ConfiguratorContextValue | null>(null);

export function ConfiguratorProvider({ children }: { children: ReactNode }) {
  const [config, setState] = useState<ConfiguratorState>(() => updateConfigPrice(defaultConfig));
  const [catalog, setCatalog] = useState<ConfiguratorCatalog>(() => getDefaultConfiguratorCatalog());
  const [isReady, setIsReady] = useState(false);
  const skippedInitialPersist = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const localCatalog = readAdminConfiguratorCatalog();
    setCatalog(localCatalog);

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setState(updateConfigPrice({ ...defaultConfig, ...JSON.parse(raw) }, localCatalog));
      } else {
        setState(updateConfigPrice(defaultConfig, localCatalog));
      }
    } catch {
      setState(updateConfigPrice(defaultConfig, localCatalog));
    }

    setIsReady(true);

    fetchConfiguratorCatalog()
      .then((remoteCatalog) => {
        if (cancelled) return;
        const nextCatalog = hasConfiguratorCatalogData(remoteCatalog) || !hasConfiguratorCatalogData(localCatalog)
          ? remoteCatalog
          : localCatalog;
        setCatalog(nextCatalog);
        setState((current) => updateConfigPrice(current, nextCatalog));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!skippedInitialPersist.current) {
      skippedInitialPersist.current = true;
      return;
    }

    if (!isReady) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Some browsers block localStorage; keep the configurator usable.
    }
  }, [config]);

  useEffect(() => {
    const confirmLeave = (event: BeforeUnloadEvent) => {
      if (config.productType || config.flowerType) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", confirmLeave);
    return () => window.removeEventListener("beforeunload", confirmLeave);
  }, [config.productType, config.flowerType]);

  const value = useMemo<ConfiguratorContextValue>(() => ({
    config,
    catalog,
    isReady,
    setConfig: (patch) => setState((current) => createConfigPatch(current, patch, catalog)),
    replaceConfig: (next) => setState(updateConfigPrice(next, catalog)),
    resetConfig: () => setState(updateConfigPrice(defaultConfig, catalog))
  }), [catalog, config, isReady]);

  return <ConfiguratorContext.Provider value={value}>{children}</ConfiguratorContext.Provider>;
}

export function useConfigurator() {
  const value = useContext(ConfiguratorContext);
  if (!value) throw new Error("useConfigurator must be used inside ConfiguratorProvider");
  return value;
}

export function useOptionalConfigurator() {
  return useContext(ConfiguratorContext);
}
