import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "SkinVersus — Compare CS2 Skins", template: "%s | SkinVersus" },
  description: "Compare CS2 skins side by side, vote in community battles, build shortlists and read player reviews.",
  applicationName: "SkinVersus",
  openGraph: {
    title: "SkinVersus — Compare CS2 Skins",
    description: "Compare skins, see community preference and make a better pick.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <footer className="mx-auto mt-20 max-w-7xl border-t border-white/[.055] px-5 py-10">
          <div className="flex flex-col gap-4 text-xs leading-6 text-zinc-700 md:flex-row md:items-start md:justify-between">
            <div><span className="font-semibold text-zinc-500">SkinVersus</span><br />Community-powered CS2 skin comparisons.</div>
            <p className="max-w-2xl md:text-right">SkinVersus is an independent community project and is not affiliated with Valve Corporation or Steam. Counter-Strike and related trademarks belong to their respective owners.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
