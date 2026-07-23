"use client";

import { useEffect } from "react";

export function AosProvider() {
  useEffect(() => {
    let cancelled = false;

    const frameId = window.requestAnimationFrame(() => {
      void import("aos")
        .then(({ default: AOS }) => {
          if (cancelled) return;

          AOS.init({
            duration: 650,
            easing: "ease-out-cubic",
            once: true,
            offset: 80,
            disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
          });
        })
        .catch(() => {
          // AOS is decorative. If its client chunk fails during HMR, keep the page usable.
        });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return null;
}
