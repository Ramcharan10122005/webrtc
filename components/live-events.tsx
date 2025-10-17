"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Clock, Mic2 } from "lucide-react"
import Link from "next/link"

const liveEvents = [
  {
    id: 1,
    sport: "Cricket",
    teams: { home: "India", away: "Australia" },
    scores: { home: 245, away: 189 },
    status: "Live",
    time: "45.2 Overs",
    viewers: 12500,
    voiceRoomUsers: 8,
  },
  {
    id: 2,
    sport: "Football",
    teams: { home: "Manchester City", away: "Liverpool" },
    scores: { home: 2, away: 1 },
    status: "Live",
    time: "78'",
    viewers: 8900,
    voiceRoomUsers: 6,
  },
  {
    id: 3,
    sport: "Kabaddi",
    teams: { home: "Patna Pirates", away: "Bengal Warriors" },
    scores: { home: 28, away: 24 },
    status: "Live",
    time: "2nd Half",
    viewers: 3200,
    voiceRoomUsers: 4,
  },
]

export function LiveEvents() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Live Events</h2>
            <p className="text-muted-foreground">Join the action happening right now</p>
          </div>
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse mr-2" />
            {liveEvents.length} Live
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveEvents.map((event) => (
            <Card
              key={event.id}
              className="group hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-xs">
                    {event.sport}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-500 font-medium">{event.status}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{event.teams.home}</span>
                      <span className="text-2xl font-bold text-accent">{event.scores.home}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.teams.away}</span>
                      <span className="text-2xl font-bold">{event.scores.away}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{event.time}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{event.viewers.toLocaleString()} watching</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mic2 className="w-3 h-3 text-accent" />
                      <span>{event.voiceRoomUsers} in voice</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/event/${event.id}`} className="flex-1">
                      <Button variant="outline" className="w-full border-accent/20 hover:bg-accent/10 bg-transparent">
                        View Event
                      </Button>
                    </Link>
                    <Link href={`/voice-room/${event.id}`} className="flex-1">
                      <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground group-hover:scale-[1.02] transition-transform">
                        Join Voice Room
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
