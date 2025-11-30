import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
