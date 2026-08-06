import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "MSE Learning Lab",
    template: "%s | MSE Learning Lab",
  },
  description:
    "Learn materials science through clear teaching, interactive visualizations, simulations, and topic-built practice quizzes.",
  applicationName: "MSE Learning Lab",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "MSE Learning Lab",
    description:
      "Explore how structure, processing, properties, and performance connect.",
    type: "website",
    images: [
      {
        url: "/og.png",
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
    images: ["/og.png"],
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
