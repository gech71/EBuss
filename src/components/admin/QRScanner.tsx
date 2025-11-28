
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { QrCode, CheckCircle, XCircle, Camera, RotateCw, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import jsQR from "jsqr";
import type { Ticket, Route, Bus, Location, Booking } from "@prisma/client";
import { cn } from "@/lib/utils";

type ScanStatus = "idle" | "scanning" | "success" | "error";
type ScannedData = Ticket & { route: Route & { origin: Location, destination: Location }, booking: Booking };

export function QRScanner() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    stopCamera();
  }, [stopCamera]);

  const handleScanResult = useCallback(async (encodedData: string) => {
    stopScan();
    console.log("QR Code detected:", encodedData);
    try {
        const decodedData = atob(encodedData);
        const { ticketId } = JSON.parse(decodedData);
        if (!ticketId) throw new Error("Invalid QR code format.");

        console.log(`[AUDIT] Sending scan request for ticketId: ${ticketId}`);
        const response = await fetch(`/api/ticket/${ticketId}/scan`, {
            method: 'POST',
        });
        const result = await response.json();
        console.log("API Response:", { status: response.status, body: result });

        if (response.ok && result.ticket) {
            setScanStatus("success");
            setScannedData(result.ticket);
        } else {
            console.error("Scan error from API:", result.message);
            setScanStatus("error");
            setErrorMessage(result.message || 'This ticket is not valid.');
        }
    } catch (error) {
        console.error("Error processing QR code:", error);
        setScanStatus("error");
        setErrorMessage('Could not read the QR code or the format is invalid.');
    }
  }, [stopScan]);

  const scanFrame = useCallback(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    
    animationFrameRef.current = requestAnimationFrame(scanFrame);
    
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
                    console.log("jsQR detected a code:", code.data);
                    handleScanResult(code.data);
                }
            } catch (e) {
                console.error("jsQR error:", e);
            }
        }
    }
  }, [isScanning, handleScanResult]);
  
  const startScan = useCallback(async () => {
    setErrorMessage(null);
    setScannedData(null);
    setScanStatus("idle");

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        setHasCameraPermission(true);

        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Ensure video plays, especially on mobile
            videoRef.current.play().catch(e => console.error("Video play failed:", e));
        }
        setIsScanning(true);
    } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setIsScanning(false);
        toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this app.',
        });
    }
  }, [toast]);
  
  useEffect(() => {
    if(isScanning) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
    } else {
        if(animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    }
    return () => {
        if(animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    }
  }, [isScanning, scanFrame]);

  // Check for initial camera permission without activating it
  useEffect(() => {
    navigator.permissions.query({ name: 'camera' as PermissionName }).then((permissionStatus) => {
        setHasCameraPermission(permissionStatus.state !== 'denied');
        permissionStatus.onchange = () => {
            setHasCameraPermission(permissionStatus.state !== 'denied');
        };
    });
  }, []);

  // Cleanup effect to stop the camera when the component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);


  const resetScanner = () => {
    setScannedData(null);
    setErrorMessage(null);
    setScanStatus("idle");
    setIsScanning(false);
  };
  
  const renderScanResult = () => {
    if (scanStatus === "success" && scannedData) {
      return (
        <>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <span>Ticket Validated & Used</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This ticket has been successfully marked as used. Welcome aboard!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-sm space-y-2">
            <p><strong>Passenger:</strong> {scannedData.booking.passengerName}</p>
            <p><strong>Route:</strong> {scannedData.route.origin.name} to {scannedData.route.destination.name}</p>
            <p><strong>Seat:</strong> {scannedData.seatNumber}</p>
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
      <Card className="w-full max-w-sm aspect-video flex items-center justify-center bg-black border-dashed overflow-hidden relative">
        <video ref={videoRef} className={cn("w-full h-full object-cover", {"hidden": !isScanning})} autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
         {hasCameraPermission === false && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-background text-center p-4">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                        Please allow camera access in your browser settings and refresh the page.
                    </AlertDescription>
                </Alert>
             </div>
         )}
         {hasCameraPermission && !isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-center p-4">
                <QrCode className="w-16 h-16 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground font-semibold">Ready to Scan</p>
            </div>
         )}
      </Card>

      <Button
        onClick={isScanning ? stopScan : startScan}
        size="lg"
        className="w-full max-w-sm"
        variant={isScanning ? 'destructive' : 'default'}
        disabled={hasCameraPermission === false}
      >
        {isScanning ? (
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
