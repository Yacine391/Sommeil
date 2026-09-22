import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YSleep — Mon sommeil, sans pression",
  description:
    "Journal et analyses personnelles du sommeil, stockés localement.",
  applicationName: "YSleep",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YSleep",
  },
  other: {
    "theme-color": "#07070a",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
