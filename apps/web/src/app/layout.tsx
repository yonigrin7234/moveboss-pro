import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoveBoss Pro",
  description: "MoveBoss Pro - Transportation Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}
        suppressHydrationWarning
      >
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('moveboss-theme');
                  
                  // Explicitly restrict to only 'light' or 'dark'
                  // Convert any invalid value (including 'system', null, undefined, etc.) to 'dark'
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                    // Ensure localStorage is set correctly
                    localStorage.setItem('moveboss-theme', 'light');
                  } else {
                    // Add dark class and force dark mode
                    document.documentElement.classList.add('dark');
                    // Normalize any invalid theme value to 'dark'
                    if (theme !== 'dark') {
                      localStorage.setItem('moveboss-theme', 'dark');
                    }
                  }
                  
                  // Prevent system preference detection by ensuring color-scheme is not set
                  // This ensures the browser doesn't use system preferences
                  var meta = document.querySelector('meta[name="color-scheme"]');
                  if (meta) {
                    meta.remove();
                  }
                } catch (e) {
                  // Default to dark mode if localStorage fails
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          themes={['light', 'dark']}
          enableSystem={false}
          disableTransitionOnChange={false}
          enableColorScheme={false}
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
