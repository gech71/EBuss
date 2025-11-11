
import { Header } from "@/components/Header";
import { validateRequest } from "@/lib/server/auth";

export default async function ForcePasswordChangeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();

  return (
      <div className="flex flex-col min-h-screen w-full bg-muted/20">
        {/* We pass a null user to the header to prevent showing admin/logout links */}
        <Header user={null} isMiniApp={false} />
        <main className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              {children}
            </div>
        </main>
      </div>
  );
}
