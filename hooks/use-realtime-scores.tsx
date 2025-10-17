"use client"

import { useState, useEffect } from "react"

interface ScoreUpdate {
  eventId: string
  homeScore: number
  awayScore: number
  status: string
  time: string
  lastUpdate: number
}

export function useRealtimeScores(eventId: string) {
  const [scores, setScores] = useState<ScoreUpdate>({
    eventId,
    homeScore: 245,
    awayScore: 189,
    status: "Live",
    time: "45.2 Overs",
    lastUpdate: Date.now(),
  })

  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    if (!isLive) return

    // Simulate real-time score updates
    const interval = setInterval(() => {
      setScores((prev) => {
        const shouldUpdate = Math.random() > 0.7 // 30% chance of update
        if (!shouldUpdate) return prev

        const scoreIncrease = Math.floor(Math.random() * 6) + 1 // 1-6 runs
        const isHomeTeam = Math.random() > 0.5

        return {
          ...prev,
          homeScore: isHomeTeam ? prev.homeScore + scoreIncrease : prev.homeScore,
          awayScore: !isHomeTeam ? prev.awayScore + scoreIncrease : prev.awayScore,
          time: `${(45 + Math.random() * 5).toFixed(1)} Overs`,
          lastUpdate: Date.now(),
        }
      })
    }, 3000) // Update every 3 seconds

    return () => clearInterval(interval)
  }, [isLive])

  return { scores, isLive, setIsLive }
}
