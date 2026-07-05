import type { Metadata } from "next";
import { Lora, Open_Sans } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Vacation Photos",
    template: "%s | Vacation Photos",
  },
  description: "A personal library of vacation memories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${openSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="relative flex min-h-full flex-col font-medium text-foreground">
        <AuthProvider>
          <div className="relative z-10 flex min-h-full flex-1 flex-col">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
