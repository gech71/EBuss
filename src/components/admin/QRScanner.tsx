
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, XCircle, Camera, RotateCw, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import jsQR from "jsqr";
import type { Booking, Route, Bus, Location, BookedSeat } from "@prisma/client";

type ScanStatus = "idle" | "scanning" | "success" | "error";
type ScannedData = Booking & { route: Route & { origin: Location, destination: Location }, bookedSeats: BookedSeat[] };

export function QRScanner() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopScan = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanStatus("idle");
  }, []);

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      stopScan();
    };
  }, [stopScan]);
  
  const handleScanResult = useCallback(async (decodedQR: string) => {
    stopScan();
    try {
        const { ticketId } = JSON.parse(decodedQR);
        if (!ticketId) throw new Error("Invalid QR code format.");

        const response = await fetch(`/api/ticket/${ticketId}`);
        const result = await response.json();

        if (response.ok && result.booking) {
            setScanStatus("success");
            setScannedData(result.booking);
        } else {
            setScanStatus("error");
            setErrorMessage(result.message || 'This ticket is not valid.');
        }
    } catch (error) {
        setScanStatus("error");
        setErrorMessage('Could not read the QR code or the format is invalid.');
    }
  }, [stopScan]);

  const scanFrame = useCallback(() => {
    if (scanStatus !== 'scanning' || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    handleScanResult(code.data);
                    return; 
                }
            } catch (e) {
                console.error("jsQR error:", e);
            }
        }
    }
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [scanStatus, handleScanResult]);
  
  const startScan = async () => {
    setErrorMessage(null);
    setScannedData(null);
    setScanStatus("scanning");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setHasCameraPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      setScanStatus('idle');
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to use this feature.',
      });
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setErrorMessage(null);
    setScanStatus("idle");
    // Don't reset hasCameraPermission, so the error message persists if needed
  };
  
  const renderScanResult = () => {
    if (scanStatus === "success" && scannedData) {
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
    if (scanStatus === "error") {
      return (
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-8 w-8" />
            <span>Ticket Invalid</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {errorMessage || "This ticket could not be validated. Please check the details and try again."}
          </AlertDialogDescription>
        </AlertDialogHeader>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-4">
      <Card className="w-full max-w-sm aspect-video flex items-center justify-center bg-muted/50 border-dashed overflow-hidden relative">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
         {scanStatus === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-center p-4">
             {hasCameraPermission === false ? (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                        Please allow camera access in your browser settings and try again.
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
        onClick={scanStatus === 'scanning' ? stopScan : startScan}
        size="lg"
        className="w-full max-w-sm"
        variant={scanStatus === 'scanning' ? 'destructive' : 'default'}
        disabled={hasCameraPermission === false}
      >
        {scanStatus === 'scanning' ? (
          <><RotateCw className="mr-2 h-4 w-4 animate-spin" /> Stop Scanning</>
        ) : (
          <><Camera className="mr-2 h-4 w-4" /> Start Scanning</>
        )}
      </Button>

      <AlertDialog open={scanStatus === 'success' || scanStatus === 'error'} onOpenChange={(open) => !open && resetScanner()}>
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

    