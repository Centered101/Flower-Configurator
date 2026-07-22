"use client";

import { useEffect } from "react";

export function GlobalInteractionGuards() {
  useEffect(() => {
    const preventImageDefault = (event: Event) => {
      if (event.target instanceof HTMLImageElement) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventImageDefault);
    document.addEventListener("dragstart", preventImageDefault);

    return () => {
      document.removeEventListener("contextmenu", preventImageDefault);
      document.removeEventListener("dragstart", preventImageDefault);
    };
  }, []);

  return null;
}
