import type { Metadata } from "next";
import { Manrope, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/ui/AuthProvider";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IncidentFlow",
  description: "Calm coordination when production is on fire.",
};

// Runs before first paint so there is no flash of the wrong theme.
// Uses the saved choice ("light" | "dark"); defaults to dark when nothing is saved.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':true;var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // "dark" is the server-rendered default; the script above swaps it before paint.
      // suppressHydrationWarning: that script changes the class and style on <html>.
      className={`dark ${manrope.variable} ${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning: browser extensions inject attributes on <body> */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* On every page load, AuthProvider silently restores the session
            from the httpOnly refresh cookie BEFORE rendering the page.
            Without it, every reload looks logged out. */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}