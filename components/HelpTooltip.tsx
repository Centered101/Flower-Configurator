"use client";

import { CircleHelp, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

type HelpTooltipProps = {
  title?: string;
  content: ReactNode;
  label?: string;
  side?: "left" | "right";
  align?: "top" | "middle";
  className?: string;
  panelClassName?: string;
};

export function HelpTooltip({
  title,
  content,
  label = "ดูคำอธิบาย",
  side = "right",
  align = "top",
  className = "",
  panelClassName = ""
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <span ref={rootRef} className={`relative inline-flex shrink-0 ${className}`}>
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setIsOpen((current) => !current)}
        aria-label={label}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? panelId : undefined}
        className="inline-flex size-8 items-center justify-center rounded-full border border-pink-100 bg-white text-blossom shadow-sm transition hover:border-blossom hover:bg-blush hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blossom/35"
      >
        <CircleHelp size={17} aria-hidden="true" />
      </button>
      {isOpen ? (
        <span
          id={panelId}
          role="tooltip"
          className={`absolute z-[80] w-[min(300px,calc(100vw-40px))] rounded-soft border border-pink-100 bg-white p-4 text-left text-sm leading-6 text-zinc-700 shadow-soft ${
            side === "left" ? "right-0" : "left-0"
          } ${align === "middle" ? "top-1/2 -translate-y-1/2" : "top-10"} ${panelClassName}`}
        >
          <span className="flex items-start justify-between gap-3">
            {title ? <strong className="text-ink">{title}</strong> : null}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setIsOpen(false)}
              className="-mr-2 -mt-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-blush hover:text-ink"
              aria-label="ปิดคำอธิบาย"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </span>
          <span className={title ? "mt-2 block" : "block"}>{content}</span>
        </span>
      ) : null}
    </span>
  );
}
