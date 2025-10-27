"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mic, MicOff, Hand, Users, Volume2, Settings, ArrowLeft, Crown, Square, Circle } from "lucide-react"
import Link from "next/link"
import { useLiveKit } from "@/hooks/use-livekit"
import { useRealtimeScores } from "@/hooks/use-realtime-scores"
import { RealtimeNotifications } from "@/components/realtime-notifications"
import { useAuth } from "@/hooks/use-auth"

interface User {
  id: string
  name: string
  avatar?: string
  isSpeaking: boolean
  isMuted: boolean
  isAdmin: boolean
  requestedToSpeak: boolean
}

interface VoiceRoomInterfaceProps {
  eventId: string
}

export function VoiceRoomInterface({ eventId }: VoiceRoomInterfaceProps) {
  const { user } = useAuth()
  const { 
    isConnected, 
    isMuted, 
    audioLevel, 
    users: livekitUsers, 
    remoteStreams, 
    toggleMute, 
    joinRoom, 
    leaveRoom,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording 
  } = useLiveKit(eventId, user?.name || user?.id || "user")
  const { scores, isLive } = useRealtimeScores(eventId)

  const [currentUser] = useState<User>({
    id: user?.id || "current-user",
    name: user?.name || "You",
    avatar: user?.avatar || "",
    isSpeaking: false,
    isMuted: false,
    isAdmin: false,
    requestedToSpeak: false,
  })

  // Convert LiveKit users to our User interface
  const listeners: User[] = livekitUsers.map(livekitUser => ({
    id: livekitUser.id,
    name: livekitUser.name,
    avatar: "",
    isSpeaking: livekitUser.isSpeaking,
    isMuted: livekitUser.isMuted,
    isAdmin: false, // You can implement admin logic later
    requestedToSpeak: false, // You can implement hand raising later
  }))

  // Find the current speaker (first speaking user or first user if none speaking)
  const currentSpeaker: User = listeners.find(user => user.isSpeaking) || listeners[0] || {
    id: "no-speaker",
    name: "No one speaking",
    avatar: "",
    isSpeaking: false,
    isMuted: false,
    isAdmin: false,
    requestedToSpeak: false,
  }

  const [hasRequestedToSpeak, setHasRequestedToSpeak] = useState(false)

  useEffect(() => {
    if (currentSpeaker.isSpeaking && audioLevel > 0) {
      // Audio level is now coming from WebRTC hook
    }
  }, [currentSpeaker.isSpeaking, audioLevel])

  const handleRequestToSpeak = () => {
    setHasRequestedToSpeak(!hasRequestedToSpeak)
  }

  const handleMuteToggle = () => {
    toggleMute()
  }

  const handleRecordClick = async () => {
    if (!isRecording) {
      // Show alert with instructions
      alert("RECORDING INSTRUCTIONS:\n\n1. Select THIS TAB when prompted\n2. Check 'Share tab audio' to capture audio\n3. Your microphone will also be recorded\n4. Click Stop when finished")
      try {
        await startRecording()
      } catch (err) {
        console.error("Recording failed:", err)
        alert(`Recording failed: ${err}`)
      }
    } else {
      stopRecording()
    }
  }

  useEffect(() => {
    joinRoom()
    return () => {
      leaveRoom()
    }
  }, [joinRoom, leaveRoom])

  const eventInfo = {
    sport: "Cricket",
    teams: { home: "India", away: "Australia" },
    scores: { home: scores.homeScore, away: scores.awayScore },
    status: scores.status,
    time: scores.time,
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <RealtimeNotifications />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href={`/event/${eventId}`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Event
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
              <span className="text-xs text-muted-foreground">{isConnected ? "Connected" : "Connecting..."}</span>
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">
                <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
                <span className="text-sm text-red-500 font-medium">REC {formatRecordingTime(recordingDuration)}</span>
              </div>
            )}
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Hidden audio tags for remote streams (autoplay requires user gesture, see Enable Audio button) */}
        {[...remoteStreams.entries()].map(([peerId, stream]) => (
          <audio
            key={peerId}
            ref={(el) => {
              if (el && el.srcObject !== stream) {
                el.srcObject = stream
                el.muted = false
                el.volume = 1
                el.preload = "none"
                el.controls = false
                // Optimize for voice quality
                if (el.setSinkId) {
                  el.setSinkId('default').catch(() => {})
                }
              }
            }}
            autoPlay
            playsInline
            style={{ display: "none" }}
          />
        ))}

        {/* Event Info */}
        <Card className="mb-6 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {eventInfo.sport}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isLive ? "bg-red-500 animate-pulse" : "bg-gray-500"}`} />
                    <span className={`text-xs font-medium ${isLive ? "text-red-500" : "text-gray-500"}`}>
                      {eventInfo.status}
                    </span>
                  </div>
                </div>
                <h1 className="text-lg font-semibold">
                  {eventInfo.teams.home} vs {eventInfo.teams.away}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-accent">
                  {eventInfo.scores.home} - {eventInfo.scores.away}
                </div>
                <div className="text-sm text-muted-foreground">{eventInfo.time}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Speaker */}
        <Card className="mb-6 border-accent/30 bg-gradient-to-br from-card to-accent/5">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <div
                  className="absolute inset-0 rounded-full bg-accent/20 animate-pulse"
                  style={{
                    transform: `scale(${1 + audioLevel / 200})`,
                    transition: "transform 0.1s ease-out",
                  }}
                />
                <Avatar className="w-24 h-24 border-4 border-accent/50 relative z-10">
                  <AvatarImage src={currentSpeaker.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="text-2xl bg-accent/10">
                    {currentSpeaker.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                {currentSpeaker.isAdmin && (
                  <div className="absolute -top-2 -right-2 bg-accent rounded-full p-1">
                    <Crown className="w-4 h-4 text-accent-foreground" />
                  </div>
                )}
              </div>

              <h2 className="text-xl font-semibold mb-2">{currentSpeaker.name}</h2>
              <div className="flex items-center justify-center gap-2">
                <Mic className="w-4 h-4 text-accent" />
                <span className="text-sm text-accent font-medium">Speaking</span>
              </div>

              {/* Audio Waveform Visualization */}
              <div className="flex items-center justify-center gap-1 mt-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-accent rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(4, ((Math.sin(Date.now() / 100 + i) + 1) * (audioLevel || 50)) / 4)}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listeners */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Listeners</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{listeners.length} in room</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {listeners.map((user) => (
                <div key={user.id} className="text-center">
                  <div className="relative inline-block mb-2">
                    <Avatar className="w-16 h-16 border-2 border-border">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="text-sm">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    {user.requestedToSpeak && (
                      <div className="absolute -top-1 -right-1 bg-accent rounded-full p-1">
                        <Hand className="w-3 h-3 text-accent-foreground" />
                      </div>
                    )}
                    {user.isMuted && (
                      <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-1">
                        <MicOff className="w-3 h-3 text-destructive-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate">{user.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border/50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center">
              <Button
                size="lg"
                onClick={handleMuteToggle}
                className={`${
                  isMuted
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    : "bg-accent hover:bg-accent/90 text-accent-foreground"
                } rounded-full w-16 h-16 p-0 shadow-lg`}
              >
                {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </Button>
            </div>

            {/* Secondary controls */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestToSpeak}
                className={`${
                  hasRequestedToSpeak
                    ? "bg-accent/20 hover:bg-accent/30 text-accent border-accent/50"
                    : "border-accent/20 hover:bg-accent/10"
                } bg-transparent text-xs`}
              >
                <Hand className="w-4 h-4 mr-1" />
                {hasRequestedToSpeak ? "Cancel" : "Request"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="border-accent/20 hover:bg-accent/10 bg-transparent text-xs"
                onClick={() => {
                  document.querySelectorAll('audio').forEach((a) => a instanceof HTMLAudioElement && a.play().catch(() => {}))
                }}
              >
                <Volume2 className="w-4 h-4 mr-1" />
                Enable Audio
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRecordClick}
                className={`${
                  isRecording
                    ? "border-red-500/50 hover:bg-red-500/10 text-red-500"
                    : "border-accent/20 hover:bg-accent/10"
                } bg-transparent text-xs`}
              >
                {isRecording ? <Square className="w-4 h-4 mr-1" /> : <Circle className="w-4 h-4 mr-1" />}
                {isRecording ? "Stop" : "Record"}
              </Button>
            </div>
          </div>
        </div>

        <div className="h-32"></div>
      </div>
    </div>
  )
}
