"use client";

import Image from "next/image";
import { BRAND_NAME } from "@/lib/brand";

export function BrandLogo({ size = 40, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-soft bg-blush" style={{ width: size, height: size }}>
      <Image
        src="/favicon.png"
        alt={`โลโก้ ${BRAND_NAME}`}
        width={size}
        height={size}
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        className="select-none object-cover"
        priority={priority}
      />
    </span>
  );
}
