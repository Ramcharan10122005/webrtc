"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Navbar } from "@/components/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { VoiceRoomInterface } from "@/components/voice-room-interface"

export default function AdHocRoomPage() {
  const { code } = useParams<{ code: string }>()!
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminName, setAdminName] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const res = await fetch(`/api/rooms?code=${code}`)
        const data = await res.json()
        if (res.ok) {
          const uid = Number.isFinite(Number(user?.id)) ? Number(user?.id) : null
          setIsAdmin(!!uid && data?.created_by === uid)
          if (data?.created_by_username) setAdminName(data.created_by_username)
        }
      } catch {}
    }
    if (user) loadRoom()
  }, [code, user])

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
      <VoiceRoomInterface eventId={code} hearOnlyForAdmin isAdmin={isAdmin} adminName={adminName} />
      <style jsx global>{`
        /* Replace default event title with room code on ad-hoc page */
        /* Hide sport/status badges for ad-hoc rooms */
        .min-h-screen.bg-background .max-w-4xl .mb-6 .p-4 .flex.items-center.justify-between > div > div:first-child { display: none; }
      `}</style>
      {typeof window !== 'undefined' && (
        <ScriptSetter code={code} />
      )}
    </div>
  )
}

function ScriptSetter({ code }: { code: string }) {
  useEffect(() => {
    const titleEl = document.querySelector('.min-h-screen.bg-background .max-w-4xl .mb-6 .p-4 h1') as HTMLElement | null
    if (titleEl) {
      titleEl.textContent = code
    }
  }, [code])
  return null
}


