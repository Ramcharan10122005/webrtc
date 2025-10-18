"use client"

import LiveKitAudioRoom from "@/components/LiveKitAudioRoom"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestLiveKitPage() {
  const [roomName, setRoomName] = useState("ind-vs-aus")
  const [participantName, setParticipantName] = useState("user-1")
  const [showRoom, setShowRoom] = useState(false)

  if (showRoom) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-4">
            <Button 
              onClick={() => setShowRoom(false)}
              variant="outline"
            >
              ← Back to Setup
            </Button>
          </div>
          <LiveKitAudioRoom 
            roomName={roomName} 
            participantName={participantName} 
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test LiveKit Audio Room</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Room Name:</label>
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., ind-vs-aus"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Participant Name:</label>
            <Input
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="e.g., user-1"
            />
          </div>

          <div className="text-sm text-gray-600">
            <p><strong>Test Instructions:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Open this page on two different devices</li>
              <li>Use the same room name on both</li>
              <li>Use different participant names</li>
              <li>Test WiFi ↔ Mobile connectivity</li>
            </ul>
          </div>

          <Button 
            onClick={() => setShowRoom(true)}
            className="w-full"
          >
            Join Room
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
