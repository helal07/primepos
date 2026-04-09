import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { SwitchCamera, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async (facing: "environment" | "user") => {
    if (!containerRef.current) return;
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        scannerRef.current.clear();
      }
    } catch {}

    const scanner = new Html5Qrcode("barcode-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: facing },
        { fps: 10, qrbox: { width: 280, height: 160 } },
        (decodedText) => {
          onScan(decodedText);
          scanner.stop().catch(() => {});
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
        className="w-full min-h-[260px] rounded-lg overflow-hidden bg-black"
      />
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleCamera}>
          <SwitchCamera className="h-4 w-4 mr-1" /> Flip Camera
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}
