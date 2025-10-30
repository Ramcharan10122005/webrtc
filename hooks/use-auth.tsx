"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

interface User {
  id: string
  name: string
  email: string
  avatar: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem("sports-platform-user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error || 'Login failed')
    }

    const data = await response.json()
    const loggedInUser: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email || data.name}`,
    }

    setUser(loggedInUser)
    localStorage.setItem("sports-platform-user", JSON.stringify(loggedInUser))
  }

  const signup = async (name: string, email: string, password: string) => {
    // Mock signup - in real app, this would call an API
    const mockUser: User = {
      id: Date.now().toString(),
      name,
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    }

    setUser(mockUser)
    localStorage.setItem("sports-platform-user", JSON.stringify(mockUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("sports-platform-user")
  }

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
