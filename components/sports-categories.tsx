"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Clock, Mic2, Calendar, Bell } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const sportsData = {
  Cricket: {
    live: [
      {
        id: 1,
        teams: { home: "India", away: "Australia" },
        scores: { home: 245, away: 189 },
        status: "Live",
        time: "45.2 Overs",
        viewers: 12500,
        voiceRoomUsers: 8,
      },
      {
        id: 4,
        teams: { home: "Pakistan", away: "Sri Lanka" },
        scores: { home: 156, away: 142 },
        status: "Live",
        time: "32.4 Overs",
        viewers: 8900,
        voiceRoomUsers: 5,
      },
      {
        id: 7,
        teams: { home: "South Africa", away: "West Indies" },
        scores: { home: 198, away: 201 },
        status: "Live",
        time: "48.1 Overs",
        viewers: 6700,
        voiceRoomUsers: 7,
      },
    ],
    upcoming: [
      {
        id: 10,
        teams: { home: "England", away: "New Zealand" },
        date: "2024-01-15",
        time: "14:30",
        venue: "Lord's Cricket Ground",
      },
      {
        id: 11,
        teams: { home: "Bangladesh", away: "Afghanistan" },
        date: "2024-01-16",
        time: "09:30",
        venue: "Shere Bangla Stadium",
      },
    ],
  },
  Football: {
    live: [
      {
        id: 2,
        teams: { home: "Manchester City", away: "Liverpool" },
        scores: { home: 2, away: 1 },
        status: "Live",
        time: "78'",
        viewers: 15600,
        voiceRoomUsers: 12,
      },
      {
        id: 5,
        teams: { home: "Barcelona", away: "Real Madrid" },
        scores: { home: 1, away: 2 },
        status: "Live",
        time: "65'",
        viewers: 22300,
        voiceRoomUsers: 15,
      },
      {
        id: 8,
        teams: { home: "PSG", away: "Bayern Munich" },
        scores: { home: 0, away: 1 },
        status: "Live",
        time: "42'",
        viewers: 18900,
        voiceRoomUsers: 9,
      },
    ],
    upcoming: [
      {
        id: 12,
        teams: { home: "Arsenal", away: "Chelsea" },
        date: "2024-01-17",
        time: "16:30",
        venue: "Emirates Stadium",
      },
      {
        id: 13,
        teams: { home: "Juventus", away: "AC Milan" },
        date: "2024-01-18",
        time: "20:45",
        venue: "Allianz Stadium",
      },
    ],
  },
  Kabaddi: {
    live: [
      {
        id: 3,
        teams: { home: "Patna Pirates", away: "Bengal Warriors" },
        scores: { home: 28, away: 24 },
        status: "Live",
        time: "2nd Half",
        viewers: 3200,
        voiceRoomUsers: 4,
      },
      {
        id: 6,
        teams: { home: "Puneri Paltan", away: "Jaipur Pink Panthers" },
        scores: { home: 31, away: 29 },
        status: "Live",
        time: "2nd Half",
        viewers: 2800,
        voiceRoomUsers: 6,
      },
    ],
    upcoming: [
      {
        id: 14,
        teams: { home: "Tamil Thalaivas", away: "U Mumba" },
        date: "2024-01-19",
        time: "19:30",
        venue: "Jawaharlal Nehru Stadium",
      },
    ],
  },
}

export function SportsCategories() {
  const [activeTab, setActiveTab] = useState("Cricket")

  return (
    <section className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4 lg:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-center lg:text-left">
            Sports Events
          </h2>
          <p className="text-muted-foreground text-center lg:text-left mb-6 sm:mb-8">
            Choose your favorite sport and join the action
          </p>

          {/* Sports Category Tabs - Fully Responsive */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-3 lg:gap-4">
            {Object.keys(sportsData).map((sport) => (
              <Button
                key={sport}
                variant={activeTab === sport ? "default" : "outline"}
                onClick={() => setActiveTab(sport)}
                className={`text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 transition-all duration-300 ${
                  activeTab === sport
                    ? "bg-accent text-accent-foreground shadow-lg shadow-accent/25"
                    : "border-accent/20 hover:bg-accent/10 bg-transparent"
                }`}
              >
                {sport}
                <Badge variant="secondary" className="ml-2 text-xs bg-accent/20 text-accent border-0">
                  {sportsData[sport as keyof typeof sportsData].live.length}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Live Events Section */}
        <div className="mb-8 sm:mb-12 lg:mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 lg:mb-8 gap-3 sm:gap-0">
            <div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Live {activeTab} Events</h3>
              <p className="text-muted-foreground text-sm sm:text-base">Join the action happening right now</p>
            </div>
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 self-start sm:self-auto">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse mr-2" />
              {sportsData[activeTab as keyof typeof sportsData].live.length} Live
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {sportsData[activeTab as keyof typeof sportsData].live.map((event) => (
              <Card
                key={event.id}
                className="group hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:scale-[1.02]"
              >
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <Badge variant="outline" className="text-xs">
                      {activeTab}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs text-red-500 font-medium">{event.status}</span>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="text-center">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm sm:text-base truncate flex-1 text-left">
                          {event.teams.home}
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-accent ml-2">{event.scores.home}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm sm:text-base truncate flex-1 text-left">
                          {event.teams.away}
                        </span>
                        <span className="text-xl sm:text-2xl font-bold ml-2">{event.scores.away}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{event.time}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 justify-center sm:justify-start">
                        <Users className="w-3 h-3" />
                        <span>{event.viewers.toLocaleString()} watching</span>
                      </div>
                      <div className="flex items-center gap-1 justify-center sm:justify-end">
                        <Mic2 className="w-3 h-3 text-accent" />
                        <span>{event.voiceRoomUsers} in voice</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link href={`/event/${event.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full border-accent/20 hover:bg-accent/10 bg-transparent text-xs sm:text-sm"
                        >
                          View Event
                        </Button>
                      </Link>
                      <Link href={`/voice-room/${event.id}`} className="flex-1">
                        <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground group-hover:scale-[1.02] transition-transform text-xs sm:text-sm">
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

        {/* Upcoming Events Section */}
        <div className="bg-card/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Upcoming {activeTab} Events</h3>
            <p className="text-muted-foreground text-sm sm:text-base">Don't miss these exciting matches</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {sportsData[activeTab as keyof typeof sportsData].upcoming.map((event) => (
              <Card
                key={event.id}
                className="group hover:border-accent/50 transition-all duration-300 hover:scale-[1.02]"
              >
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <Badge variant="outline" className="text-xs">
                      {activeTab}
                    </Badge>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className="hidden sm:inline">{event.date}</span>
                      <span className="sm:hidden">{event.date.split("-").slice(1).join("/")}</span>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="text-center">
                      <div className="text-base sm:text-lg font-semibold mb-1 leading-tight">
                        {event.teams.home} vs {event.teams.away}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate" title={event.venue}>
                        {event.venue}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-accent" />
                      <span className="font-medium">{event.time}</span>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full border-accent/20 hover:bg-accent/10 group-hover:scale-[1.02] transition-transform bg-transparent text-xs sm:text-sm"
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
      </div>
    </section>
  )
}
