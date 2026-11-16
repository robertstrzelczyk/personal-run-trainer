import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Trener biegowy dla Garmin Venu 2 Plus",
  description:
    "Osobisty trener biegania: poziom sprawności, efektywność biegu i trening na dziś na podstawie Twoich aktywności z Garmina.",
  applicationName: "Trener biegowy",
  appleWebApp: { capable: true, title: "Trener biegowy", statusBarStyle: "default" },
  ...(process.env.NEXT_PUBLIC_MOBILE_BUILD === "1"
    ? {}
    : { icons: { icon: "/icons/192", apple: "/icons/192" } }),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d9468",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-center" richColors />
        <ServiceWorker />
      </body>
    </html>
  );
}
