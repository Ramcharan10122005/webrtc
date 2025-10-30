"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Navbar } from "@/components/navbar"
import LiveKitAudioRoom from "@/components/LiveKitAudioRoom"
import { Card, CardContent } from "@/components/ui/card"

export default function AdHocRoomPage() {
  const { code } = useParams<{ code: string }>()!
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">You need to sign in to join voice rooms</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto p-4">
        <div className="mb-4 text-sm text-muted-foreground">Room Code</div>
        <div className="text-2xl font-bold tracking-widest mb-6">{code}</div>
        <LiveKitAudioRoom roomName={code} participantName={user.name} />
      </div>
    </div>
  )
}


