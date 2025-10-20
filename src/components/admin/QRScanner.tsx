
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, XCircle, VideoOff, RotateCw, Camera } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Card } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

  const stopStream = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
  }, []);

  const resetScanner = () => {
    setStatus("idle");
    setIsDialogOpen(false);
    setScannedData(null);
  };
  
   const getCameraPermission = useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        setHasCameraPermission(true);
        setStatus("scanning");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setStatus("idle");
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    }, [toast]);


  const handleScanResult = useCallback(async (decodedQR: string) => {
    stopStream();
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
            setScannedData(null); // Explicitly clear data on invalid
             toast({
                title: 'Scan Failed',
                description: result.message || 'This ticket is not valid.',
                variant: 'destructive',
            });
        }
    } catch (error) {
        console.error("Error processing QR code:", error);
        setStatus("invalid");
        setScannedData(null);
         toast({
            title: 'Scan Error',
            description: 'Could not read the QR code.',
            variant: 'destructive',
        });
    } finally {
        setIsDialogOpen(true);
    }
  }, [toast, stopStream]);


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


  // Effect for handling the animation frame loop
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
      stopStream();
    };
  }, [status, hasCameraPermission, tick, stopStream]);
  

  const handleButtonClick = () => {
      if (status === 'scanning') {
          setStatus('idle');
          stopStream();
      } else {
          getCameraPermission();
      }
  }


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
            This ticket could not be validated. Please check the details and try again.
          </AlertDialogDescription>
        </AlertDialogHeader>
      );
    }
    return null;
  };

  const getButtonText = () => {
      if (status === 'scanning') {
          return "Stop Scanning";
      }
      if (hasCameraPermission === false) {
          return "Retry Camera Access";
      }
      return "Start Scanning";
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-4">
      <Card className="w-full max-w-sm aspect-video flex items-center justify-center bg-muted/50 border-dashed overflow-hidden relative">
        <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
         { status !== 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-center p-4">
               {hasCameraPermission === false ? (
                    <Alert variant="destructive" className="text-left">
                        <VideoOff className="h-4 w-4" />
                        <AlertTitle>Camera Access Denied</AlertTitle>
                        <AlertDescription>
                            Please allow camera access in your browser settings to use this feature.
                        </AlertDescription>
                    </Alert>
               ) : (
                    <>
                        <QrCode className="w-16 h-16 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground font-semibold">Ready to Scan</p>
                    </>
               )}
          </div>
        )}
      </Card>

      <Button
        onClick={handleButtonClick}
        size="lg"
        className="w-full max-w-sm"
        variant={status === 'scanning' ? 'destructive' : 'default'}
      >
        {status === 'scanning' ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
        {getButtonText()}
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
