import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000/";
const siteBaseUrl = new URL(
  configuredSiteUrl.endsWith("/") ? configuredSiteUrl : `${configuredSiteUrl}/`,
);
const socialImageUrl = new URL("og.png", siteBaseUrl).toString();

export const dynamic = "force-static";

export const metadata: Metadata = {
  metadataBase: siteBaseUrl,
  title: {
    default: "MSE Learning Lab",
    template: "%s | MSE Learning Lab",
  },
  description:
    "Learn materials science through clear teaching, interactive visualizations, simulations, and topic-built practice quizzes.",
  applicationName: "MSE Learning Lab",
  icons: {
    icon: `${publicBasePath}/favicon.svg`,
    shortcut: `${publicBasePath}/favicon.svg`,
  },
  openGraph: {
    title: "MSE Learning Lab",
    description:
      "Explore how structure, processing, properties, and performance connect.",
    type: "website",
    images: [
      {
        url: socialImageUrl,
        width: 1200,
        height: 630,
        alt: "MSE Learning Lab crystal lattice, engineering materials, and learning graphs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MSE Learning Lab",
    description:
      "Explore how structure, processing, properties, and performance connect.",
    images: [socialImageUrl],
  },
};

export const viewport: Viewport = {
  themeColor: "#FDF6EC",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
