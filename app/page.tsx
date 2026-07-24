import { CalendarClock, Coins, Images } from "lucide-react";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/HeroSection";
import { HomeGallerySection } from "@/components/HomeGallerySection";
import { HomeStartingPrice } from "@/components/HomeStartingPrice";
import { HomeProductTypesSection } from "@/components/HomeProductTypesSection";
import { Navbar } from "@/components/Navbar";
import { nextAvailableDate } from "@/lib/capacity";
import { formatThaiIsoDate } from "@/lib/date-format";
import { fetchHomeGalleryItems, fetchHomeProducts } from "@/lib/public-home-data";

export default async function HomePage() {
  const nearestAvailableDate = nextAvailableDate(3);
  const [products, galleryItems] = await Promise.all([
    fetchHomeProducts(),
    fetchHomeGalleryItems()
  ]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <HeroSection />
        <section className="container-page grid gap-4 py-8 md:grid-cols-3" data-aos="fade-up">
          <div className="rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
            <Coins className="text-blossom" />
            <p className="mt-3 text-sm text-zinc-500">ราคาเริ่มต้น</p>
            <HomeStartingPrice />
          </div>
          <div className="rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
            <CalendarClock className="text-stem" />
            <p className="mt-3 text-sm text-zinc-500">คิวว่างใกล้ที่สุด</p>
            <p className="text-2xl font-bold text-ink">{nearestAvailableDate ? formatThaiIsoDate(nearestAvailableDate) : "-"}</p>
          </div>
          <div className="rounded-bloom border border-pink-100 bg-white p-5 shadow-sm">
            <Images className="text-blossom" />
            <p className="mt-3 text-sm text-zinc-500">ผลงานตัวอย่าง</p>
            <p className="text-2xl font-bold text-ink">ดูในแกลเลอรี</p>
          </div>
        </section>
        <HomeProductTypesSection initialProducts={products} />
        <HomeGallerySection initialItems={galleryItems} />
      </main>
      <Footer />
    </>
  );
}
