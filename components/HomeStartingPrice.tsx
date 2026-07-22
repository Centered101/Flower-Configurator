"use client";

import { useEffect, useState } from "react";
import { fetchConfiguratorCatalog } from "@/lib/configurator-catalog";

export function HomeStartingPrice() {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    fetchConfiguratorCatalog()
      .then((catalog) => {
        const prices = catalog.productTypes.map((item) => item.price).filter((itemPrice) => Number.isFinite(itemPrice));
        setPrice(prices.length ? Math.min(...prices) : null);
      })
      .catch(() => setPrice(null));
  }, []);

  return (
    <p className="text-2xl font-bold text-ink">
      {price === null ? "ดูราคาในหน้าออกแบบ" : `${price.toLocaleString("th-TH")} บาท`}
    </p>
  );
}
