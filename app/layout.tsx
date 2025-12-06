import type { Metadata } from "next";
import { Geist, Geist_Mono, Creepster, Mountains_of_Christmas, Outfit, Marcellus, Josefin_Sans, Plus_Jakarta_Sans, Kalam, Patrick_Hand, Playfair_Display, Source_Serif_4 } from "next/font/google";
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

const creepster = Creepster({
  weight: "400",
  variable: "--font-creepster",
  subsets: ["latin"],
});

const mountainsOfChristmas = Mountains_of_Christmas({
  weight: ["400", "700"],
  variable: "--font-mountains",
  subsets: ["latin"],
});

const outfit = Outfit({
  weight: ["400", "500", "700", "900"],
  variable: "--font-outfit",
  subsets: ["latin"],
});

const marcellus = Marcellus({
  weight: "400",
  variable: "--font-marcellus",
  subsets: ["latin"],
});

const josefinSans = Josefin_Sans({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-josefin",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
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

const playfairDisplay = Playfair_Display({
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-playfair",
  subsets: ["latin"],
});

const sourceSerif4 = Source_Serif_4({
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-serif",
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
        className={`${geistSans.variable} ${geistMono.variable} ${creepster.variable} ${mountainsOfChristmas.variable} ${outfit.variable} ${marcellus.variable} ${josefinSans.variable} ${plusJakartaSans.variable} ${kalam.variable} ${patrickHand.variable} ${playfairDisplay.variable} ${sourceSerif4.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
