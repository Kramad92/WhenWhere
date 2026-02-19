import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WhenWhere",
  description: "See what time it is anywhere — hover cities on the map, compare up to 4 side-by-side, and share with your team.",
  openGraph: {
    title: "WhenWhere",
    description: "See what time it is anywhere — hover cities on the map, compare up to 4 side-by-side, and share with your team.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent FOUC: apply theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('tz-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className={`${geist.className} dark:bg-slate-950 bg-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
