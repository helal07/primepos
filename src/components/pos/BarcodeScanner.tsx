import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { SwitchCamera, X, Camera, RefreshCw, ImageIcon, AlertCircle } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  /** Keep camera running and accept multiple scans (debounced). Default: true */
  continuous?: boolean;
}

export default function BarcodeScanner({ onScan, onClose, continuous = true }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "no_camera" | "busy">("prompt");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [lastCode, setLastCode] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const beep = () => {
    try {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 90);
    } catch {}
  };

  const startScanner = async (facing: "environment" | "user") => {
    if (!containerRef.current) return;
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        scannerRef.current.clear();
      }
    } catch {}

    // Proactive permission probe — if denied, skip the start call
    try {
      // @ts-ignore - camera is a valid PermissionName in modern browsers
      const status = await navigator.permissions?.query?.({ name: "camera" as PermissionName });
      if (status?.state === "denied") {
        setPermissionState("denied");
        setError("");
        return;
      }
    } catch {}

    const scanner = new Html5Qrcode("barcode-reader", {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
      ],
      verbose: false,
    });
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: facing },
        {
          fps: 15,
          qrbox: (vw: number, vh: number) => {
            const minEdge = Math.min(vw, vh);
            const w = Math.floor(minEdge * 0.85);
            const h = Math.floor(w * 0.55);
            return { width: w, height: h };
          },
          aspectRatio: window.innerWidth < 640 ? window.innerHeight / window.innerWidth : undefined,
        },
        (decodedText) => {
          const now = Date.now();
          // debounce duplicate decodes (1.2s)
          if (
            decodedText === lastScanRef.current.code &&
            now - lastScanRef.current.at < 1200
          ) {
            return;
          }
          lastScanRef.current = { code: decodedText, at: now };
          setLastCode(decodedText);
          beep();
          try { (navigator as any).vibrate?.(60); } catch {}
          onScan(decodedText);
          if (!continuous) {
            scanner.stop().catch(() => {});
          }
        },
        () => {}
      );
      setError("");
      setPermissionState("granted");
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermissionState("denied");
        setError("");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setPermissionState("no_camera");
        setError("No camera found on this device.");
      } else if (name === "NotReadableError") {
        setPermissionState("busy");
        setError("Camera is in use by another app. Close other apps and try again.");
      } else {
        setError(err?.message || "Camera unavailable. Please try again.");
      }
    }
  };

  useEffect(() => {
    startScanner(facingMode);
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startScanner(next);
  };

  const handleFilePick = async (file: File) => {
    try {
      const scanner = new Html5Qrcode("barcode-reader");
      const text = await scanner.scanFile(file, true);
      try { await scanner.clear(); } catch {}
      if (text) {
        beep();
        onScan(text);
      }
    } catch (e: any) {
      setError("Couldn't read a barcode from that photo. Try a clearer, closer shot.");
    }
  };

  const showDeniedPanel = permissionState === "denied" || permissionState === "no_camera" || permissionState === "busy";

  if (showDeniedPanel) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:p-6 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-base">
              {permissionState === "denied" && "Camera permission needed"}
              {permissionState === "no_camera" && "No camera found"}
              {permissionState === "busy" && "Camera is busy"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {permissionState === "denied" &&
                "We need access to your camera to scan barcodes. Tap Allow camera, or use a saved photo instead."}
              {permissionState === "no_camera" &&
                "We couldn't detect a camera. You can upload a photo of the barcode instead."}
              {permissionState === "busy" &&
                "Another app is using the camera. Close it and try again, or upload a photo of the barcode."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => { setPermissionState("prompt"); setError(""); startScanner(facingMode); }}
              className="w-full sm:w-auto"
            >
              <Camera className="h-4 w-4 mr-2" /> Allow camera
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
              <ImageIcon className="h-4 w-4 mr-2" /> Take / pick photo
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f); e.target.value = ""; }}
          />
        </div>

        {permissionState === "denied" && (
          <details className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3">
            <summary className="cursor-pointer font-medium">How to enable camera in your browser</summary>
            <div className="mt-2 space-y-2">
              <p><b>iPhone (Safari):</b> Settings → Safari → Camera → Allow. Then reload this page.</p>
              <p><b>Android (Chrome):</b> Tap the lock icon in the address bar → Permissions → Camera → Allow. Then reload.</p>
              <p><b>Desktop:</b> Click the lock/site-settings icon next to the URL → set Camera to Allow → reload.</p>
            </div>
          </details>
        )}

        <div id="barcode-reader" ref={containerRef} className="hidden" />

        <Button variant="outline" className="w-full" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        id="barcode-reader"
        ref={containerRef}
        className="w-full min-h-[60vh] sm:min-h-[340px] rounded-lg overflow-hidden bg-black"
      />
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive text-center space-y-2">
          <p>{error}</p>
          <Button size="sm" variant="outline" onClick={() => { setError(""); startScanner(facingMode); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Try again
          </Button>
        </div>
      )}
      {continuous && lastCode && !error && (
        <p className="text-xs text-center text-muted-foreground">
          Last scan: <span className="font-mono text-foreground">{lastCode}</span>
        </p>
      )}
      <div className="flex flex-col sm:flex-row justify-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleCamera} className="w-full sm:w-auto">
          <SwitchCamera className="h-4 w-4 mr-1" /> Flip Camera
        </Button>
        <Button variant="default" size="sm" onClick={onClose} className="w-full sm:w-auto">
          <X className="h-4 w-4 mr-1" /> {continuous ? "Done" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}
