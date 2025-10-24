
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import prisma from "@/lib/prisma";
import { Lucia, TimeSpan, Session, User } from "lucia";
import { cookies } from "next/headers";
import { cache } from "react";

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(30, "m"), // 30 minute idle timeout
	sessionCookie: {
		expires: true, // The cookie should expire
        // Cookie expires in 2 hours, which acts as the absolute session lifetime
        maxAge: 60 * 60 * 2, 
		attributes: {
			secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
		}
	},
    getUserAttributes: (attributes) => {
        return {
            email: attributes.email,
            name: attributes.name,
            role: attributes.role,
            busOwnerId: attributes.busOwnerId
        }
    }
});

// IMPORTANT!
declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
    email: string;
    name: string;
    role: string;
    busOwnerId: string | null;
}

export const validateRequest = (async (): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;
	if (!sessionId) {
		return {
			user: null,
			session: null
		};
	}

	const result = await lucia.validateSession(sessionId);
	
	try {
		if (result.session && result.session.fresh) {
			const sessionCookie = lucia.createSessionCookie(result.session.id);
			cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		}
		if (!result.session) {
			const sessionCookie = lucia.createBlankSessionCookie();
			cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		}
	} catch {
		// Next.js throws error when attempting to set cookies when rendering page
	}
	
	return result;
});
