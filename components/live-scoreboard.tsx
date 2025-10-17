"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface EventInfo {
  sport: string
  teams: { home: string; away: string }
  scores: { home: number; away: number }
  status: string
  time: string
}

interface LiveScoreboardProps {
  eventInfo: EventInfo
}

export function LiveScoreboard({ eventInfo }: LiveScoreboardProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-accent/5 rounded-lg">
              <span className="font-semibold">{eventInfo.teams.home}</span>
              <span className="text-3xl font-bold text-accent">{eventInfo.scores.home}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg">
              <span className="font-semibold">{eventInfo.teams.away}</span>
              <span className="text-3xl font-bold">{eventInfo.scores.away}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />
                {eventInfo.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{eventInfo.time}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
