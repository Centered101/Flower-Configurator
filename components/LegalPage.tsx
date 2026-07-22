import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { BRAND_NAME } from "@/lib/brand";

export function LegalPage({
  title,
  updatedAt,
  intro,
  sections
}: {
  title: string;
  updatedAt: string;
  intro: string;
  sections: { title: string; body: string[] }[];
}) {
  return (
    <>
      <Navbar />
      <main className="container-page min-h-screen py-10">
        <article className="mx-auto max-w-3xl rounded-bloom border border-pink-100 bg-white p-5 shadow-sm sm:p-8" data-aos="fade-up">
          <p className="text-sm font-semibold text-blossom">{BRAND_NAME}</p>
          <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">อัปเดตล่าสุด: {updatedAt}</p>
          <p className="mt-6 leading-8 text-zinc-700">{intro}</p>
          <div className="mt-8 space-y-7">
            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-xl font-bold text-ink">{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="leading-8 text-zinc-700">{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
