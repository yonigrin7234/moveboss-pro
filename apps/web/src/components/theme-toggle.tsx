"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch and normalize theme value
  React.useEffect(() => {
    setMounted(true)
    // Ensure theme is always 'light' or 'dark', never 'system'
    if (theme && theme !== 'light' && theme !== 'dark') {
      setTheme('light')
      // Also update localStorage directly to ensure consistency
      if (typeof window !== 'undefined') {
        localStorage.setItem('moveboss-theme', 'light')
      }
    }
  }, [theme, setTheme])
  
  // Additional safeguard: listen for storage changes and normalize
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'moveboss-theme' && e.newValue && e.newValue !== 'light' && e.newValue !== 'dark') {
        localStorage.setItem('moveboss-theme', 'light')
        setTheme('light')
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [setTheme])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-10 w-10">
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  // Normalize theme to ensure it's always 'light' or 'dark'
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 relative">
          <Sun className={`h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0`} />
          <Moon className={`absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100`} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => {
            setTheme("light")
            // Ensure localStorage is updated immediately
            if (typeof window !== 'undefined') {
              localStorage.setItem('moveboss-theme', 'light')
            }
          }}
          className={normalizedTheme === "light" ? "bg-accent" : ""}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
          {normalizedTheme === "light" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            setTheme("dark")
            // Ensure localStorage is updated immediately
            if (typeof window !== 'undefined') {
              localStorage.setItem('moveboss-theme', 'dark')
            }
          }}
          className={normalizedTheme === "dark" ? "bg-accent" : ""}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {normalizedTheme === "dark" && <span className="ml-auto">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

