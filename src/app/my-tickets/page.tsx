
import { Header } from '@/components/Header';
import { cookies } from 'next/headers';
import { MyTicketsClientPage } from '@/components/my-tickets/MyTicketsClientPage';

function getMiniAppData() {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('miniapp_session');
    if (sessionCookie) {
        try {
            const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('ascii');
            const sessionData = JSON.parse(decodedSession);
            return {
                isMiniApp: sessionData.isAuthenticated as boolean,
                phoneNumber: sessionData.phoneNumber as string | undefined,
            };
        } catch (error) {
            console.error("Failed to parse mini-app session cookie:", error);
            return { isMiniApp: false, phoneNumber: undefined };
        }
    }
    return { isMiniApp: false, phoneNumber: undefined };
}


export default async function MyTicketsPage() {
    const { isMiniApp, phoneNumber } = getMiniAppData();
    
    return (
        <div className="flex flex-col min-h-screen bg-muted/20">
            <Header user={null} isMiniApp={isMiniApp} />
            <main className="flex-1 container mx-auto py-8 px-4">
               <MyTicketsClientPage isMiniApp={isMiniApp} phoneNumberFromSession={phoneNumber} />
            </main>
        </div>
    );
}
