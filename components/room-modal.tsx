"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

interface RoomModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId?: string
}

export default function RoomModal({ open, onOpenChange, eventId }: RoomModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [error, setError] = useState("")
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const handleCreate = async () => {
    try {
      setError("")
      setCreating(true)
      const numericUserId = Number.isFinite(Number(user?.id)) ? Number(user?.id) : null
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: numericUserId, eventId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(`${data?.error || 'Failed to create room'}${data?.details ? `: ${data.details}` : ''}`)
      setCreatedCode(data.code)
    } catch (e: any) {
      setError(e?.message || 'Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async () => {
    try {
      setError("")
      setJoining(true)
      const code = joinCode.trim().toUpperCase()
      if (code.length !== 8) {
        setError('Please enter a valid 8-character code')
        return
      }
      const numericUserId = Number.isFinite(Number(user?.id)) ? Number(user?.id) : null
      const res = await fetch(`/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userId: numericUserId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(`${data?.error || 'Failed to join room'}${data?.details ? `: ${data.details}` : ''}`)
      onOpenChange(false)
      router.push(`/voice-room/${code}`)
    } catch (e: any) {
      setError(e?.message || 'Failed to join room')
    } finally {
      setJoining(false)
    }
  }

  const goToCreatedRoom = () => {
    if (!createdCode) return
    onOpenChange(false)
    router.push(`/voice-room/${createdCode}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/90 backdrop-blur border-border/50">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Voice Room</DialogTitle>
          <DialogDescription>Start a room with a code or join an existing one</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="create">Create Room</TabsTrigger>
            <TabsTrigger value="join">Join Room</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="border-border/50 bg-background/50">
              <CardContent className="pt-4 space-y-3">
                {createdCode ? (
                  <div className="space-y-3 text-center">
                    <p className="text-sm text-muted-foreground">Share this code with friends</p>
                    <div className="text-3xl font-bold tracking-widest">{createdCode}</div>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => navigator.clipboard.writeText(createdCode!)} variant="outline" className="border-accent/20">Copy Code</Button>
                      <Button onClick={goToCreatedRoom} className="bg-accent hover:bg-accent/90 text-accent-foreground">Enter Room</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-sm text-muted-foreground">Create a private room and invite others with a code</p>
                    <Button disabled={creating} onClick={handleCreate} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                      {creating ? 'Creating...' : 'Create Room'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="border-border/50 bg-background/50">
              <CardContent className="pt-4 space-y-3">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter 8-character code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="tracking-widest text-center uppercase"
                  />
                  <Button disabled={joining} onClick={handleJoin} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    {joining ? 'Joining...' : 'Join Room'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="text-sm text-destructive mt-2 text-center">{error}</div>
        )}
      </DialogContent>
    </Dialog>
  )
}


