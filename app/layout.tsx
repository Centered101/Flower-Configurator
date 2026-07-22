import type { Metadata, Viewport } from "next";
import { Kanit, Source_Code_Pro } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AosProvider } from "@/components/AosProvider";
import { GlobalInteractionGuards } from "@/components/GlobalInteractionGuards";
import { BRAND_NAME, CREATOR_NAME, SITE_URL } from "@/lib/brand";
import { keywordsToArray, readSeoSettings } from "@/lib/seo-settings";
import "aos/dist/aos.css";
import "./globals.css";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-kanit"
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-source-code-pro"
});

export const revalidate = 300;

function safeMetadataBase(siteUrl: string) {
  try {
    return new URL(siteUrl);
  } catch {
    return new URL(SITE_URL);
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await readSeoSettings();
  const title = seo.siteTitle || BRAND_NAME;
  const description = seo.siteDescription;
  const shareImage = seo.ogImageUrl || "/favicon.png";
  const twitterImage = seo.twitterImageUrl || shareImage;

  return {
    metadataBase: safeMetadataBase(seo.siteUrl),
    title,
    description,
    applicationName: title,
    authors: [{ name: CREATOR_NAME }],
    creator: CREATOR_NAME,
    publisher: CREATOR_NAME,
    alternates: {
      canonical: seo.canonicalPath || "/"
    },
    robots: {
      index: seo.robotsIndex,
      follow: seo.robotsFollow,
      googleBot: {
        index: seo.robotsIndex,
        follow: seo.robotsFollow,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    keywords: keywordsToArray(seo.siteKeywords),
    openGraph: {
      title: seo.ogTitle || title,
      description: seo.ogDescription || description,
      siteName: title,
      locale: "th_TH",
      type: "website",
      url: seo.canonicalPath || "/",
      images: [
        {
          url: shareImage,
          width: 1200,
          height: 630,
          alt: `${title} โดย ${CREATOR_NAME}`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: seo.twitterTitle || seo.ogTitle || title,
      description: seo.twitterDescription || seo.ogDescription || description,
      images: [twitterImage]
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon.png", type: "image/png" }
      ],
      shortcut: "/favicon.ico",
      apple: "/favicon.png"
    }
  };
}

export async function generateViewport(): Promise<Viewport> {
  const seo = await readSeoSettings();

  return {
    themeColor: seo.themeColor
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const seo = await readSeoSettings();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: seo.siteTitle || BRAND_NAME,
    description: seo.siteDescription,
    url: seo.siteUrl,
    applicationCategory: "ShoppingApplication",
    inLanguage: "th",
    creator: {
      "@type": "Person",
      name: CREATOR_NAME
    },
    publisher: {
      "@type": "Person",
      name: CREATOR_NAME
    }
  };

  return (
    <html lang="th" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${kanit.variable} ${sourceCodePro.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <AosProvider />
        <GlobalInteractionGuards />
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-kanit), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            }
          }}
        />
        {children}
      </body>
    </html>
  );
}
