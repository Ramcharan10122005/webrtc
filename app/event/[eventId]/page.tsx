"use client"

import { EventDetail } from "@/components/event-detail"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"

export default function EventDetailPage() {
  const params = useParams()
  const eventId = params.eventId as string

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <EventDetail eventId={eventId} />
    </div>
  )
}
