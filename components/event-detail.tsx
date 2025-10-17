"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RecordingsList } from "@/components/recordings-list"
import { LiveScoreboard } from "@/components/live-scoreboard"
import { MatchStats } from "@/components/match-stats"
import { ArrowLeft, Mic2, Users, Calendar } from "lucide-react"
import Link from "next/link"

interface EventDetailProps {
  eventId: string
}

export function EventDetail({ eventId }: EventDetailProps) {
  const eventInfo = {
    id: eventId,
    sport: "Cricket",
    teams: { home: "India", away: "Australia" },
    scores: { home: 245, away: 189 },
    status: "Live",
    time: "45.2 Overs",
    venue: "Melbourne Cricket Ground",
    date: "2024-01-15",
    viewers: 12500,
    voiceRoomUsers: 8,
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/voice-room/${eventId}`}>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Mic2 className="w-4 h-4 mr-2" />
                Join Voice Room
              </Button>
            </Link>
          </div>
        </div>

        {/* Event Header */}
        <Card className="mb-6 border-accent/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {eventInfo.sport}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-500 font-medium">{eventInfo.status}</span>
                  </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                  {eventInfo.teams.home} vs {eventInfo.teams.away}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{eventInfo.date}</span>
                  </div>
                  <span>{eventInfo.venue}</span>
                </div>
              </div>
              <div className="text-center md:text-right">
                <div className="text-3xl md:text-4xl font-bold text-accent mb-1">
                  {eventInfo.scores.home} - {eventInfo.scores.away}
                </div>
                <div className="text-sm text-muted-foreground">{eventInfo.time}</div>
                <div className="flex items-center justify-center md:justify-end gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{eventInfo.viewers.toLocaleString()} watching</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mic2 className="w-3 h-3 text-accent" />
                    <span>{eventInfo.voiceRoomUsers} in voice</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="scoreboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card/50">
            <TabsTrigger value="scoreboard">Live Scoreboard</TabsTrigger>
            <TabsTrigger value="stats">Match Stats</TabsTrigger>
            <TabsTrigger value="recordings">Voice Recordings</TabsTrigger>
          </TabsList>

          <TabsContent value="scoreboard">
            <LiveScoreboard eventInfo={eventInfo} />
          </TabsContent>

          <TabsContent value="stats">
            <MatchStats eventInfo={eventInfo} />
          </TabsContent>

          <TabsContent value="recordings">
            <RecordingsList eventId={eventId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
