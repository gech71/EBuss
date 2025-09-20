
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, XCircle, VideoOff, RotateCw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Card } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import jsQR from "jsqr";
import type { Booking, Route, Bus, Location, BookedSeat } from "@prisma/client";

type ScanStatus = "idle" | "scanning" | "valid" | "invalid";
type ScannedData = Booking & { route: Route & { origin: Location, destination: Location }, bookedSeats: BookedSeat[] };

export function QRScanner() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  const resetScanner = () => {
    setStatus("idle");
    setIsDialogOpen(false);
    setScannedData(null);
  };

  const handleScanResult = useCallback(async (decodedQR: string) => {
    try {
        const { ticketId } = JSON.parse(decodedQR);
        if (!ticketId) throw new Error("Invalid QR code format.");

        const response = await fetch(`/api/ticket/${ticketId}`);
        const result = await response.json();

        if (response.ok && result.booking) {
            setStatus("valid");
            setScannedData(result.booking);
        } else {
            setStatus("invalid");
            setScannedData(null);
        }
    } catch (error) {
        console.error("Error processing QR code:", error);
        setStatus("invalid");
        setScannedData(null);
    } finally {
        setIsDialogOpen(true);
    }
  }, []);


  const tick = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code) {
          handleScanResult(code.data);
          // Stop scanning
          return;
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  }, [handleScanResult]);


  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };

    getCameraPermission();
    
    return () => {
      // Cleanup: stop video stream and animation frame when the component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [toast]);

  useEffect(() => {
    if (status === 'scanning' && hasCameraPermission) {
      animationFrameId.current = requestAnimationFrame(tick);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }

    return () => {
       if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [status, hasCameraPermission, tick]);

  const renderScanResult = () => {
    if (status === "valid" && scannedData) {
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
            <p><strong>Passenger:</strong> {scannedData.passengerName}</p>
            <p><strong>Route:</strong> {scannedData.route.origin.name} to {scannedData.route.destination.name}</p>
            <p><strong>Seat(s):</strong> {scannedData.bookedSeats.map(s => s.seatNumber).join(', ')}</p>
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
            This ticket is not valid. It may have already been used, is for a different route, or is fraudulent.
          </AlertDialogDescription>
        </AlertDialogHeader>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-4">
      <Card className="w-full max-w-sm aspect-video flex items-center justify-center bg-muted/50 border-dashed overflow-hidden relative">
        <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
         { hasCameraPermission === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-center p-4">
              <VideoOff className="w-12 h-12 text-destructive" />
              <p className="mt-4 font-semibold">Camera Not Available</p>
              <p className="text-sm text-muted-foreground">Please grant camera permissions to use the scanner.</p>
          </div>
        )}
         { status === 'idle' && hasCameraPermission && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <QrCode className="w-16 h-16 text-white/80" />
                <p className="mt-4 text-white font-semibold">Ready to Scan</p>
            </div>
         )}
      </Card>

      <Button
        onClick={() => status === 'scanning' ? resetScanner() : setStatus('scanning')}
        disabled={hasCameraPermission === false}
        size="lg"
        className="w-full max-w-sm"
        variant={status === 'scanning' ? 'destructive' : 'default'}
      >
        {status === 'scanning' ? (
            <>
                <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                Stop Scanning
            </>
        ) : (
            "Start Scanning"
        )}
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={(open) => !open && resetScanner()}>
        <AlertDialogContent>
          {renderScanResult()}
          <AlertDialogFooter>
            <AlertDialogAction onClick={resetScanner}>Scan Next</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
