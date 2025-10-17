"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RecordingPlayer } from "@/components/recording-player"
import { Play, Clock, Users, Calendar } from "lucide-react"

interface Recording {
  id: string
  title: string
  duration: string
  date: string
  participants: number
  speakers: { name: string; duration: string; avatar?: string }[]
  isLive?: boolean
}

interface RecordingsListProps {
  eventId: string
}

export function RecordingsList({ eventId }: RecordingsListProps) {
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)

  const recordings: Recording[] = [
    {
      id: "current-live",
      title: "Live Discussion - India vs Australia",
      duration: "45:32",
      date: "2024-01-15",
      participants: 8,
      speakers: [
        { name: "Alex Johnson", duration: "12:45" },
        { name: "Sarah Chen", duration: "8:20" },
        { name: "Mike Wilson", duration: "15:30" },
        { name: "Emma Davis", duration: "9:17" },
      ],
      isLive: true,
    },
    {
      id: "rec-1",
      title: "Pre-Match Analysis - India vs Australia",
      duration: "28:45",
      date: "2024-01-15",
      participants: 12,
      speakers: [
        { name: "Cricket Expert", duration: "18:30" },
        { name: "Fan Discussion", duration: "10:15" },
      ],
    },
    {
      id: "rec-2",
      title: "Post-Match Discussion - India vs England",
      duration: "35:20",
      date: "2024-01-12",
      participants: 15,
      speakers: [
        { name: "Match Analysis", duration: "20:45" },
        { name: "Fan Reactions", duration: "14:35" },
      ],
    },
    {
      id: "rec-3",
      title: "Live Commentary - Australia vs New Zealand",
      duration: "1:12:30",
      date: "2024-01-10",
      participants: 22,
      speakers: [
        { name: "Live Commentary", duration: "45:20" },
        { name: "Fan Discussion", duration: "27:10" },
      ],
    },
  ]

  if (selectedRecording) {
    return <RecordingPlayer recording={selectedRecording} onBack={() => setSelectedRecording(null)} />
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Voice Room Recordings
            <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
              {recordings.length} recordings
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recordings.map((recording) => (
            <Card
              key={recording.id}
              className={`group hover:border-accent/50 transition-all duration-300 cursor-pointer ${
                recording.isLive ? "border-accent/30 bg-accent/5" : ""
              }`}
              onClick={() => setSelectedRecording(recording)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold group-hover:text-accent transition-colors">{recording.title}</h3>
                      {recording.isLive && (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />
                          Recording
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{recording.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{recording.participants} participants</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{recording.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Speakers:</span>
                      {recording.speakers.slice(0, 3).map((speaker, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {speaker.name}
                        </Badge>
                      ))}
                      {recording.speakers.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{recording.speakers.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground group-hover:scale-105 transition-transform"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {recording.isLive ? "Listen Live" : "Play"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
