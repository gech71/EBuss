"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Card, CardContent } from '../ui/card';

type ScanStatus = "idle" | "scanning" | "valid" | "invalid";

export function QRScanner() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleScan = () => {
    setStatus("scanning");
    // Simulate a scan
    setTimeout(() => {
      const isValid = Math.random() > 0.3; // 70% chance of being valid
      setStatus(isValid ? "valid" : "invalid");
      setIsDialogOpen(true);
    }, 1500);
  };

  const reset = () => {
    setStatus("idle");
    setIsDialogOpen(false);
  };

  const renderScanResult = () => {
    if (status === "valid") {
      return (
        <>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <span>Ticket Valid</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This ticket is valid for entry. Welcome aboard!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-sm space-y-2">
            <p><strong>Passenger:</strong> John Doe</p>
            <p><strong>Route:</strong> New York to Boston</p>
            <p><strong>Seat:</strong> 4A</p>
          </div>
        </>
      );
    }
    if (status === "invalid") {
      return (
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-8 w-8" />
            <span>Ticket Invalid</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            This ticket is not valid. It may have already been used or is fraudulent.
          </AlertDialogDescription>
        </AlertDialogHeader>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-4">
      <Card className="w-full max-w-sm aspect-square flex items-center justify-center bg-muted/50 border-dashed">
        <CardContent className="p-0">
          <QrCode className="w-32 h-32 text-muted-foreground" />
        </CardContent>
      </Card>
      <Button
        onClick={handleScan}
        disabled={status === 'scanning'}
        size="lg"
        className="w-full max-w-sm bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {status === 'scanning' ? "Scanning..." : "Scan QR Code"}
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          {renderScanResult()}
          <AlertDialogFooter>
            <AlertDialogAction onClick={reset}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
