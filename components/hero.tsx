"use client"

import { Button } from "@/components/ui/button"
import { Play, Users, Mic } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-card py-12 sm:py-16 lg:py-20 px-3 sm:px-4 lg:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-accent/20 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-6 sm:mb-8">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span className="text-xs sm:text-sm text-muted-foreground">Live Sports & Voice Rooms</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-balance mb-4 sm:mb-6 leading-tight">
          Experience Sports
          <span className="block text-transparent bg-gradient-to-r from-accent to-purple-400 bg-clip-text mt-1 sm:mt-2">
            Like Never Before
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground text-balance max-w-2xl lg:max-w-3xl mx-auto mb-8 sm:mb-10 lg:mb-12 px-2 sm:px-0 leading-relaxed">
          Join live voice rooms during matches, connect with fellow fans, and never miss a moment of Cricket, Football,
          and Kabaddi action.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 lg:mb-16 px-4 sm:px-0">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground group px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform" />
            Watch Live Now
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-accent/20 hover:bg-accent/10 group bg-transparent px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base"
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform" />
            Join Voice Room
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
            <span>10K+ Active Users</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full animate-pulse" />
            <span>Zero Latency Audio</span>
          </div>
        </div>
      </div>
    </section>
  )
}
