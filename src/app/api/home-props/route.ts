
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { validateRequest } from "@/app/lib/auth";
import { cookies } from "next/headers";

async function getIsMiniApp() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('miniapp_session');
  if (sessionCookie) {
    try {
      const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('ascii');
      const sessionData = JSON.parse(decodedSession);
      return sessionData.isAuthenticated;
    } catch (error) {
      return false;
    }
  }
  return false;
}

export async function GET() {
    try {
        const { user } = await validateRequest();
        const isMiniApp = getIsMiniApp();
        
        const routesData = await prisma.route.findMany({
            include: {
                origin: true,
                destination: true,
                bus: {
                    include: {
                        owner: true,
                    }
                },
                discount: true,
            },
            orderBy: {
            departureTime: 'asc',
            },
            take: 100,
        });

        // Sanitize Decimal fields for client components
        const routes = routesData.map(route => ({
            ...route,
            price: Number(route.price),
        }));
        
        const locations = await prisma.location.findMany({
            orderBy: {
            name: 'asc'
            }
        });

        const owners = await prisma.busOwner.findMany({
            orderBy: {
            name: 'asc'
            }
        });

        const props = {
            user,
            isMiniApp,
            routes,
            locations,
            owners
        };

        return NextResponse.json(props);
    } catch (error) {
        console.error("Failed to fetch home page props:", error);
        return new NextResponse(JSON.stringify({ message: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
