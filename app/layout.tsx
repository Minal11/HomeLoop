import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";

import { PwaRegister } from "@/components/PwaRegister";

import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const APP_DESCRIPTION =
  "Keep your family in the loop with shared events, appointments, and plans.";

export const metadata: Metadata = {
  title: {
    default: "HomeLoop",
    template: "%s · HomeLoop",
  },
  description: APP_DESCRIPTION,
  applicationName: "HomeLoop",
  appleWebApp: {
    capable: true,
    title: "HomeLoop",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  // Still needed for Safari Add to Home Screen standalone mode on many iOS versions.
  // Next also emits modern `mobile-web-app-capable` from appleWebApp.capable.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#d6455d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
