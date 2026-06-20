import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SystemStatus } from "@/components/layout/SystemStatus";

const fontDisplay = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const fontBody = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Analysis AI",
  description: "Internal business intelligence assistant",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t==null&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-ink dark:bg-primary dark:text-on-dark transition-colors duration-200" suppressHydrationWarning>
        <SystemStatus />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){[].forEach.call(document.querySelectorAll("*"),function(e){[].forEach.call(e.attributes,function(a){if(a.name.indexOf("jf-ext-")===0)e.removeAttribute(a.name)})});var c=console.error;console.error=function(){for(var i=0;i<arguments.length;i++){if(typeof arguments[i]==="string"&&arguments[i].indexOf("jf-ext-")!==-1)return}return c.apply(console,arguments)}})()`,
          }}
        />
      </body>
    </html>
  );
}
