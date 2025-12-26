"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      storageKey="moveboss-theme"
      defaultTheme="dark"
      themes={['light', 'dark']}
      enableSystem={false}
      disableTransitionOnChange={false}
      attribute="class"
      enableColorScheme={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
