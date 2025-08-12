import { QRScanner } from "@/components/admin/QRScanner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ScanPage() {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Ticket Scanner</CardTitle>
        <CardDescription>
          Use your device's camera to scan a customer's QR code and validate their ticket.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QRScanner />
      </CardContent>
    </Card>
  );
}
