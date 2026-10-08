import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Amirverse",
  description: "دنیای شخصی سه‌بعدی و هوشمند Amirverse",
  applicationName: "Amirverse",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#020713"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
