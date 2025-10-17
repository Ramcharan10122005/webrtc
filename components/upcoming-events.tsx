"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Bell } from "lucide-react"

const upcomingEvents = [
  {
    id: 1,
    sport: "Cricket",
    teams: { home: "England", away: "New Zealand" },
    date: "2024-01-15",
    time: "14:30",
    venue: "Lord's Cricket Ground",
  },
  {
    id: 2,
    sport: "Football",
    teams: { home: "Barcelona", away: "Real Madrid" },
    date: "2024-01-16",
    time: "20:00",
    venue: "Camp Nou",
  },
]

export function UpcomingEvents() {
  return (
    <section className="py-16 px-4 bg-card/20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Upcoming Events</h2>
            <p className="text-muted-foreground">Don't miss these exciting matches</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingEvents.map((event) => (
            <Card key={event.id} className="group hover:border-accent/50 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-xs">
                    {event.sport}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{event.date}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold mb-1">
                      {event.teams.home} vs {event.teams.away}
                    </div>
                    <p className="text-sm text-muted-foreground">{event.venue}</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-accent" />
                    <span className="font-medium">{event.time}</span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-accent/20 hover:bg-accent/10 group-hover:scale-[1.02] transition-transform bg-transparent"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Set Reminder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
