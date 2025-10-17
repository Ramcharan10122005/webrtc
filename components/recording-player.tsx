"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipBack, SkipForward, ArrowLeft, Volume2 } from "lucide-react"

interface Recording {
  id: string
  title: string
  duration: string
  date: string
  participants: number
  speakers: { name: string; duration: string; avatar?: string }[]
  isLive?: boolean
}

interface RecordingPlayerProps {
  recording: Recording
  onBack: () => void
}

interface SpeakerSegment {
  speaker: string
  startTime: number
  endTime: number
  text: string
}

export function RecordingPlayer({ recording, onBack }: RecordingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState([75])

  // Convert duration string to seconds for calculations
  const totalDuration = recording.duration.split(":").reduce((acc, time) => 60 * acc + +time, 0)

  // Mock speaker timeline data
  const speakerSegments: SpeakerSegment[] = [
    { speaker: "Alex Johnson", startTime: 0, endTime: 765, text: "Welcome everyone to today's match discussion..." },
    {
      speaker: "Sarah Chen",
      startTime: 765,
      endTime: 1265,
      text: "Great analysis Alex! I think India's batting strategy...",
    },
    {
      speaker: "Mike Wilson",
      startTime: 1265,
      endTime: 2195,
      text: "The bowling attack from Australia has been exceptional...",
    },
    {
      speaker: "Emma Davis",
      startTime: 2195,
      endTime: 2752,
      text: "Looking at the statistics, this match is really close...",
    },
  ]

  const currentSpeaker = speakerSegments.find(
    (segment) => currentTime >= segment.startTime && currentTime <= segment.endTime,
  )

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false)
            return totalDuration
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, totalDuration])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0])
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const skipBackward = () => {
    setCurrentTime(Math.max(0, currentTime - 15))
  }

  const skipForward = () => {
    setCurrentTime(Math.min(totalDuration, currentTime + 15))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Recordings
        </Button>
        {recording.isLive && (
          <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />
            Live Recording
          </Badge>
        )}
      </div>

      {/* Player */}
      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="text-xl">{recording.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {recording.date} • {recording.participants} participants • {recording.duration}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Speaker */}
          {currentSpeaker && (
            <Card className="bg-accent/5 border-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={currentSpeaker.speaker || "/placeholder.svg"} />
                    <AvatarFallback className="text-sm">
                      {currentSpeaker.speaker
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{currentSpeaker.speaker}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{currentSpeaker.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider value={[currentTime]} max={totalDuration} step={1} onValueChange={handleSeek} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{recording.duration}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="sm" onClick={skipBackward}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button size="lg" onClick={togglePlayPause} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={skipForward}>
              <SkipForward className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 ml-4">
              <Volume2 className="w-4 h-4" />
              <Slider value={volume} max={100} step={1} onValueChange={setVolume} className="w-20" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Speaker Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Speaker Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {speakerSegments.map((segment, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-accent/5 ${
                  currentSpeaker?.speaker === segment.speaker ? "bg-accent/10 border border-accent/20" : "bg-card/50"
                }`}
                onClick={() => setCurrentTime(segment.startTime)}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={segment.speaker || "/placeholder.svg"} />
                  <AvatarFallback className="text-xs">
                    {segment.speaker
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{segment.speaker}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{segment.text}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
