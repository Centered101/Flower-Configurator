"use client";

import { usePathname } from "next/navigation";
import { HelpTooltip } from "@/components/HelpTooltip";
import { getAdminPageHelp, getUserPageHelp } from "@/lib/page-help";

export function PageHelpTooltip({ area = "user", className = "" }: { area?: "user" | "admin"; className?: string }) {
  const pathname = usePathname();
  const help = area === "admin" ? getAdminPageHelp(pathname) : getUserPageHelp(pathname);

  return (
    <HelpTooltip
      title={help.title}
      content={help.content}
      label="ดูคำแนะนำหน้านี้"
      side="left"
      className={className}
      panelClassName="right-0"
    />
  );
}
