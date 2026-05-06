import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { SwitchCamera, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  /** Keep camera running and accept multiple scans (debounced). Default: true */
  continuous?: boolean;
}

export default function BarcodeScanner({ onScan, onClose, continuous = true }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [lastCode, setLastCode] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

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
    } catch (err: any) {
      setError("Camera access denied or unavailable. Please allow camera permissions.");
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

  return (
    <div className="space-y-3">
      <div
        id="barcode-reader"
        ref={containerRef}
        className="w-full min-h-[300px] sm:min-h-[340px] rounded-lg overflow-hidden bg-black"
      />
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      {continuous && lastCode && !error && (
        <p className="text-xs text-center text-muted-foreground">
          Last scan: <span className="font-mono text-foreground">{lastCode}</span>
        </p>
      )}
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleCamera}>
          <SwitchCamera className="h-4 w-4 mr-1" /> Flip Camera
        </Button>
        <Button variant="default" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> {continuous ? "Done" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}
