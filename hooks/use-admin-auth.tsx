"use client"

import { useState, useEffect } from "react"

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if admin is authenticated
    const checkAuth = () => {
      const authenticated = localStorage.getItem("adminAuthenticated") === "true"
      const loginTime = localStorage.getItem("adminLoginTime")
      
      if (authenticated && loginTime) {
        // Check if login is still valid (24 hours)
        const now = Date.now()
        const loginTimestamp = parseInt(loginTime)
        const hoursSinceLogin = (now - loginTimestamp) / (1000 * 60 * 60)
        
        if (hoursSinceLogin < 24) {
          setIsAuthenticated(true)
        } else {
          // Session expired
          localStorage.removeItem("adminAuthenticated")
          localStorage.removeItem("adminLoginTime")
          setIsAuthenticated(false)
        }
      } else {
        setIsAuthenticated(false)
      }
      
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const logout = () => {
    localStorage.removeItem("adminAuthenticated")
    localStorage.removeItem("adminLoginTime")
    setIsAuthenticated(false)
  }

  return {
    isAuthenticated,
    isLoading,
    logout
  }
}
