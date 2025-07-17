import "@/styles/globals.css";
import { Metadata } from "next";
import { Fira_Code as FontMono, Inter as FontSans } from "next/font/google";
import '@/styles/index.css'
// import NavBar from "@/components/NavBar";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "دستیار هوش مصنوعی خدمات تشریفات فرودگاهی (CIP)  فرودگاه امام خمینی",
    template: `%s - دستیار هوش مصنوعی خدمات تشریفات فرودگاهی (CIP)  فرودگاه امام خمینی`,
  },
  icons: {
    icon: "/heygen-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable} font-sans`}
      lang="en"
    >
      <head />
      <body className="bg-black text-white overflow-hidden">
        <main className="relative w-screen h-screen overflow-hidden">
          {/* <NavBar /> */}
          {children}
        </main>
      </body>
    </html>
  );
}
