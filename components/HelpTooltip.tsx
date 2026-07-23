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
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = Math.min(280, window.innerWidth - 32);
      const preferredLeft = side === "left" ? rect.right - panelWidth : rect.left;
      const left = Math.min(Math.max(16, preferredLeft), window.innerWidth - panelWidth - 16);
      const preferredTop = align === "middle" ? rect.top + rect.height / 2 - 72 : rect.bottom + 8;
      const maxTop = Math.max(16, window.innerHeight - 180);
      const top = Math.min(Math.max(16, preferredTop), maxTop);

      setPosition({ left, top });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, isOpen, side]);

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
        ref={buttonRef}
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
          className={`fixed z-[80] max-h-[min(320px,calc(100vh-32px))] w-[min(280px,calc(100vw-32px))] overflow-auto rounded-soft border border-pink-100 bg-white p-4 text-left text-sm leading-6 text-zinc-700 shadow-soft ${panelClassName}`}
          style={{ left: position.left, top: position.top }}
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
