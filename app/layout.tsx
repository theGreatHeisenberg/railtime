import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit, Kalam, Patrick_Hand, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  weight: ["400", "500", "700", "900"],
  variable: "--font-outfit",
  subsets: ["latin"],
});

const kalam = Kalam({
  weight: ["400", "700"],
  variable: "--font-kalam",
  subsets: ["latin"],
});

const patrickHand = Patrick_Hand({
  weight: "400",
  variable: "--font-patrick-hand",
  subsets: ["latin"],
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RailTime - Real-Time Caltrain Tracker",
  description: "Real-time Caltrain tracking with live train positions, accurate predictions, and beautiful visualizations. Know exactly when your train arrives.",
  keywords: ["Caltrain", "train tracker", "real-time", "Bay Area transit", "GTFS", "train schedule", "delays", "RailTime"],
  authors: [{ name: "RailTime", url: "https://github.com/theGreatHeisenberg/railtime" }],
  creator: "Shreyas Panhalkar",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "RailTime - Real-Time Caltrain Tracker",
    description: "Real-time Caltrain tracking with live positions and accurate arrival predictions",
    type: "website",
    url: "https://github.com/theGreatHeisenberg/railtime",
    siteName: "RailTime",
  },
  twitter: {
    card: "summary_large_image",
    title: "RailTime - Real-Time Caltrain Tracker",
    description: "Real-time Caltrain tracking with live positions and accurate arrival predictions",
    creator: "@theGreatHeisenberg",
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${kalam.variable} ${patrickHand.variable} ${inter.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
