import { useState, useEffect, useRef } from "react";
import { Camera, QrCode, SwitchCamera, AlertTriangle } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  isScanning?: boolean;
  className?: string;
}

const QRCodeScanner = ({ onScan, isScanning = true, className = "" }: QRCodeScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Initialize ZXing reader
    readerRef.current = new BrowserQRCodeReader();
    
    // Get available video devices
    const getDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        
        // Prefer back camera (environment) by default - multiple strategies
        const backCamera = videoDevices.find(device => {
          const label = device.label.toLowerCase();
          return label.includes('back') || 
                 label.includes('environment') || 
                 label.includes('rear') ||
                 label.includes('facing back') ||
                 label.includes('camera 0') || // Often the main rear camera
                 (!label.includes('front') && !label.includes('user') && videoDevices.length > 1);
        });
        
        const defaultDevice = backCamera || videoDevices.find(d => !d.label.toLowerCase().includes('front')) || videoDevices[0];
        if (defaultDevice) {
          setCurrentDeviceId(defaultDevice.deviceId);
        }
      } catch (err) {
        console.error("Error getting video devices:", err);
        setError("Impossible d'accéder aux caméras disponibles.");
      }
    };

    getDevices();

    return () => {
      // Cleanup on unmount
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (isScanning) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isScanning, currentDeviceId, facingMode]);

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current) return;

    try {
      setError(null);

      let stream: MediaStream | null = null;

      if (currentDeviceId) {
        // Use specific device ID
        console.log("Using specific device:", currentDeviceId);
        const constraints = { video: { deviceId: { exact: currentDeviceId } } };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        // FORCE rear camera - be extremely aggressive
        console.log("Forcing rear camera selection...");
        
        // Strategy 1: Force environment with multiple attempts
        try {
          console.log("Trying exact environment constraint...");
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: { exact: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
          console.log("SUCCESS: Got rear camera with exact environment");
        } catch (err) {
          console.log("Exact environment failed, trying ideal...");
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            });
            console.log("SUCCESS: Got camera with ideal environment");
          } catch (err2) {
            console.log("Ideal environment failed, getting any camera...");
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("Got fallback camera");
          }
        }

        if (!stream) {
          throw new Error("Could not access any camera");
        }

        // Check if we got the right camera
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          console.log("Camera settings:", settings);
          console.log("Facing mode:", settings.facingMode);
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
      }

      setHasPermission(true);

      // Force re-detection after permissions granted
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoInputs);
        
        // If we didn't have a specific device, try to detect and switch to rear camera
        if (!currentDeviceId && videoInputs.length > 1) {
          const rearCamera = videoInputs.find(device => {
            const label = device.label.toLowerCase();
            return label.includes('back') || 
                   label.includes('environment') || 
                   label.includes('rear') ||
                   label.includes('facing back') ||
                   label.includes('camera 0') ||
                   (!label.includes('front') && !label.includes('user'));
          });
          
          if (rearCamera) {
            console.log("Found rear camera after permission:", rearCamera.label);
            setCurrentDeviceId(rearCamera.deviceId);
            return; // This will trigger a restart with the specific device
          }
        }
      } catch (e) {
        console.warn('Could not enumerate devices after permission:', e);
      }

      // Start continuous scanning
      const scanContinuously = async () => {
        if (!readerRef.current || !videoRef.current || !isScanning) return;

        try {
          const result = await readerRef.current.decodeOnceFromVideoElement(videoRef.current);
          if (result) {
            const rawData = result.getText();
            const cleanedData = rawData.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            console.log("QR Code scanned:", cleanedData);
            onScan(cleanedData);
            return; // Stop scanning after successful scan
          }
        } catch (scanError) {
          // No code yet — keep scanning
        }

        if (isScanning) {
          setTimeout(scanContinuously, 300);
        }
      };

      setTimeout(scanContinuously, 400);

    } catch (err: any) {
      console.error("Scanner error:", err);
      handleError(err);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleError = (error: any) => {
    console.error("QR Scanner error:", error);
    if (error.name === "NotAllowedError") {
      setError("Accès à la caméra refusé. Veuillez autoriser l'accès à la caméra.");
      setHasPermission(false);
    } else if (error.name === "NotFoundError") {
      setError("Aucune caméra trouvée sur cet appareil.");
    } else {
      setError("Erreur lors de l'accès à la caméra. Utilisez la saisie manuelle.");
    }
  };

  const switchCamera = () => {
    if (devices.length < 2) return;

    const currentIndex = devices.findIndex(device => device.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    
    setCurrentDeviceId(nextDevice.deviceId);
    setFacingMode(nextDevice.label.toLowerCase().includes('front') || nextDevice.label.toLowerCase().includes('user') ? "user" : "environment");
    setError(null);
  };

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Immediately stop preview from this temporary stream; startScanning will create the real one
      stream.getTracks().forEach(t => t.stop());
      setHasPermission(true);
      setError(null);

      // Populate devices after permission
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (!currentDeviceId && videoInputs[0]) {
        setCurrentDeviceId(videoInputs[0].deviceId);
      }
    } catch (err: any) {
      handleError(err);
    }
  };

  if (hasPermission === false) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || "Accès à la caméra requis pour scanner les QR codes"}
          </AlertDescription>
        </Alert>
        <Button onClick={requestPermission} className="w-full">
          <Camera className="w-4 h-4 mr-2" />
          Autoriser l'accès à la caméra
        </Button>
      </div>
    );
  }

  if (error && !isScanning) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {isScanning && (
        <div className="relative">
          <div className="w-full max-w-sm mx-auto border-2 border-primary rounded-lg overflow-hidden bg-black" style={{ height: "300px" }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
          </div>
          
          {/* Overlay de guidage */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full relative">
              {/* Coins du cadre de scan */}
              <div className="absolute top-8 left-8 w-6 h-6 border-l-2 border-t-2 border-white"></div>
              <div className="absolute top-8 right-8 w-6 h-6 border-r-2 border-t-2 border-white"></div>
              <div className="absolute bottom-8 left-8 w-6 h-6 border-l-2 border-b-2 border-white"></div>
              <div className="absolute bottom-8 right-8 w-6 h-6 border-r-2 border-b-2 border-white"></div>
            </div>
          </div>

          {/* Bouton switch caméra */}
          {devices.length > 1 && (
            <Button
              onClick={switchCamera}
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4 p-2"
            >
              <SwitchCamera className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <QrCode className="w-6 h-6 mx-auto mb-2" />
        <p>Positionnez le QR code dans le cadre</p>
      </div>
    </div>
  );
};

export default QRCodeScanner;