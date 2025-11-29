import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackTrain - Real-Time Caltrain Tracker",
  description: "Track Caltrain arrivals in real-time with live train positions, delay notifications, and accurate predictions. See scheduled vs actual times at a glance.",
  keywords: ["Caltrain", "train tracker", "real-time", "Bay Area transit", "GTFS", "train schedule", "delays"],
  authors: [{ name: "TrackTrain" }],
  openGraph: {
    title: "TrackTrain - Real-Time Caltrain Tracker",
    description: "Track Caltrain arrivals in real-time with live train positions and delay notifications",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrackTrain - Real-Time Caltrain Tracker",
    description: "Track Caltrain arrivals in real-time with live train positions and delay notifications",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
