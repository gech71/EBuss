import { Header } from "@/components/Header";
import { RouteSearch } from "@/components/RouteSearch";
import { validateRequest } from "@/app/lib/auth";

export default async function Home() {
  const { user } = await validateRequest();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header user={user} />
      <main className="flex-1 container mx-auto py-8 px-4">
        <section className="text-center mb-4">
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-2">
            Find Your Next Journey
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our routes and book your ticket today.
          </p>
        </section>

        <div className="mt-2.5">
          <RouteSearch />
        </div>
        
      </main>
    </div>
  );
}
