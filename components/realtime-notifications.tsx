"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Zap, Users, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Notification {
  id: string
  type: "score" | "voice" | "user"
  title: string
  message: string
  timestamp: number
  read: boolean
}

export function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Simulate real-time notifications
    const interval = setInterval(() => {
      const notificationTypes = [
        {
          type: "score" as const,
          title: "Score Update!",
          message: "India scores a boundary! +4 runs",
          icon: Zap,
        },
        {
          type: "voice" as const,
          title: "Voice Room",
          message: "Sarah Chen requested to speak",
          icon: Mic,
        },
        {
          type: "user" as const,
          title: "New Participant",
          message: "Mike Wilson joined the voice room",
          icon: Users,
        },
      ]

      if (Math.random() > 0.6) {
        // 40% chance of notification
        const randomNotification = notificationTypes[Math.floor(Math.random() * notificationTypes.length)]
        const newNotification: Notification = {
          id: Date.now().toString(),
          ...randomNotification,
          timestamp: Date.now(),
          read: false,
        }

        setNotifications((prev) => [newNotification, ...prev.slice(0, 4)]) // Keep only 5 notifications
        setIsVisible(true)

        // Auto-hide after 5 seconds
        setTimeout(() => {
          setIsVisible(false)
        }, 5000)
      }
    }, 8000) // Check every 8 seconds

    return () => clearInterval(interval)
  }, [])

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  if (!isVisible || notifications.length === 0) return null

  const latestNotification = notifications[0]

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Card className="w-80 border-accent/30 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-accent/10">
                {latestNotification.type === "score" && <Zap className="w-4 h-4 text-accent" />}
                {latestNotification.type === "voice" && <Mic className="w-4 h-4 text-accent" />}
                {latestNotification.type === "user" && <Users className="w-4 h-4 text-accent" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{latestNotification.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    Live
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{latestNotification.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(latestNotification.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissNotification(latestNotification.id)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {notifications.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">+{notifications.length - 1} more notifications</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
