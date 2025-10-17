"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface EventInfo {
  sport: string
  teams: { home: string; away: string }
}

interface MatchStatsProps {
  eventInfo: EventInfo
}

export function MatchStats({ eventInfo }: MatchStatsProps) {
  const stats = [
    { label: "Possession", home: 65, away: 35 },
    { label: "Shots on Target", home: 8, away: 5 },
    { label: "Corners", home: 7, away: 3 },
    { label: "Fouls", home: 12, away: 18 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stats.map((stat, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stat.home}</span>
                <span className="text-muted-foreground">{stat.label}</span>
                <span className="font-medium">{stat.away}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-16 text-right">{eventInfo.teams.home}</span>
                <div className="flex-1 flex">
                  <Progress value={(stat.home / (stat.home + stat.away)) * 100} className="flex-1" />
                  <Progress value={(stat.away / (stat.home + stat.away)) * 100} className="flex-1 rotate-180" />
                </div>
                <span className="text-xs w-16">{eventInfo.teams.away}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
