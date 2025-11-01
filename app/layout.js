import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "./contexts/authContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Tindig",
  description: "Your posture, powered by AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ userSelect: "none" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
      <link rel="manifest" href="/manifest.json" />
    </html>
  );
}
