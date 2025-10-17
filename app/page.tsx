import { Hero } from "@/components/hero"
import { SportsCategories } from "@/components/sports-categories"
import { Navbar } from "@/components/navbar"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <SportsCategories />
    </div>
  )
}
