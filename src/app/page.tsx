import { Header } from "@/components/Header";
import { RouteSearch } from "@/components/RouteSearch";


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto py-8 px-4">
        <section className="text-center mb-12">
          <h1 className="font-headline text-5xl md:text-6xl font-bold text-primary mb-4">
            Find Your Next Journey
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Effortless bus booking at your fingertips. Explore our routes and book your ticket today.
          </p>
        </section>

        <RouteSearch />
        
      </main>
    </div>
  );
}
