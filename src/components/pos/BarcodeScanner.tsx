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
  const startAfterRenderRef = useRef<"environment" | "user" | null>(null);
  const [error, setError] = useState("");
  const [permissionState, setPermissionState] = useState<"idle" | "prompt" | "granted" | "denied" | "no_camera" | "busy" | "policy_blocked">("idle");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [lastCode, setLastCode] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSecure = typeof window !== "undefined" && (window.isSecureContext || window.location.hostname === "localhost");
  const host = typeof window !== "undefined" ? window.location.host : "";
  const supportsCameraApi = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  const cameraAllowedByPolicy = (() => {
    if (typeof document === "undefined") return true;
    const policy = (document as any).permissionsPolicy || (document as any).featurePolicy;
    try {
      if (typeof policy?.allowsFeature === "function") return policy.allowsFeature("camera");
    } catch {}
    return true;
  })();

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

  const startScanner = async (facing: "environment" | "user", opts?: { skipPermissionProbe?: boolean }) => {
    if (!containerRef.current) return;
    if (!supportsCameraApi) {
      setPermissionState("no_camera");
      setError("Camera API is unavailable in this browser. Open the app in Chrome/Safari, or use Take / pick photo instead.");
      return;
    }
    if (!isSecure) {
      setPermissionState("denied");
      setError("Camera can only start on a secure HTTPS page.");
      return;
    }
    if (cameraAllowedByPolicy === false) {
      setPermissionState("policy_blocked");
      setError("Camera is blocked by this site's server Permissions-Policy header. Update the hosting .htaccess/header policy to allow camera=(self), then reload.");
      return;
    }
    try {
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
        scannerRef.current.clear();
      }
    } catch {}

    // Proactive permission probe — only on first auto-start. On user-triggered
    // retries we skip this because the cached "denied" state can be stale
    // (e.g. user just enabled camera in browser settings) and querying it
    // would block the actual prompt from firing.
    if (!opts?.skipPermissionProbe) {
      try {
        // @ts-ignore - camera is a valid PermissionName in modern browsers
        const status = await navigator.permissions?.query?.({ name: "camera" as PermissionName });
        if (status?.state === "denied") {
          setPermissionState("denied");
          setError("");
          return;
        }
      } catch {}
    }

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
        setError(cameraAllowedByPolicy === false
          ? "Camera is blocked by the site's Permissions-Policy header, so Chrome cannot show an Allow option."
          : "Permission was blocked. If you just allowed camera in browser settings, tap \"I've allowed it — restart\" below.");
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
    // Do NOT auto-start. Chrome (and some Android WebViews) will silently
    // ignore getUserMedia calls that don't originate from a user gesture,
    // which leaves the site without any recorded permission decision —
    // meaning it never appears under Site settings → Camera. We show an
    // explicit "Start camera" button instead so the request is tied to a tap.
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (permissionState !== "prompt" || !startAfterRenderRef.current) return;
    const facing = startAfterRenderRef.current;
    startAfterRenderRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      startScanner(facing, { skipPermissionProbe: true });
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionState]);

  const toggleCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startScanner(next);
  };

  // User-triggered retry. Calls getUserMedia directly inside the click gesture
  // so the browser shows its native permission prompt (or surfaces the real
  // error if the site is hard-blocked). Only after that succeeds do we hand
  // off to html5-qrcode.
  const handleAllowCamera = async () => {
    setError("");
    if (!supportsCameraApi) {
      setPermissionState("no_camera");
      setError("Camera API is unavailable in this browser. Open the app in Chrome/Safari, or use Take / pick photo instead.");
      return;
    }
    if (!isSecure) {
      setPermissionState("denied");
      setError("Camera can only start on a secure HTTPS page.");
      return;
    }
    if (cameraAllowedByPolicy === false) {
      setPermissionState("policy_blocked");
      setError("Camera is blocked by this site's server Permissions-Policy header. Update the hosting .htaccess/header policy to allow camera=(self), then reload.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      // Release immediately — html5-qrcode opens its own stream.
      stream.getTracks().forEach((t) => t.stop());
      startAfterRenderRef.current = facingMode;
      setPermissionState("prompt");
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPermissionState("denied");
        setError(cameraAllowedByPolicy === false
          ? "Camera is blocked by this site's server Permissions-Policy header, so Chrome cannot show an Allow option."
          : "Camera is still blocked for this site. Open the site settings (lock icon in the address bar) and set Camera to Allow, then tap \"I've allowed it — restart\".");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setPermissionState("no_camera");
        setError("No camera found on this device.");
      } else if (name === "NotReadableError") {
        setPermissionState("busy");
        setError("Camera is in use by another app. Close it and try again.");
      } else {
        setError(err?.message || "Couldn't start the camera. Try again.");
      }
    }
  };

  // After the user enables camera in OS/browser settings, force a clean start
  // bypassing the permissions.query cache.
  const handleHardRestart = async () => {
    setError("");
    startAfterRenderRef.current = facingMode;
    setPermissionState("prompt");
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

  const showDeniedPanel =
    permissionState === "idle" ||
    permissionState === "denied" ||
    permissionState === "no_camera" ||
    permissionState === "busy" ||
    permissionState === "policy_blocked";

  if (showDeniedPanel) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:p-6 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-base">
              {permissionState === "idle" && "Tap to start camera"}
              {permissionState === "denied" && "Camera permission needed"}
              {permissionState === "no_camera" && "No camera found"}
              {permissionState === "busy" && "Camera is busy"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {permissionState === "idle" &&
                "Your browser needs you to tap a button before it will ask for camera access. Tap Start camera below — Chrome will then show an Allow / Block popup."}
              {permissionState === "denied" &&
                "We need access to your camera to scan barcodes. Tap Allow camera, or use a saved photo instead."}
              {permissionState === "no_camera" &&
                "We couldn't detect a camera. You can upload a photo of the barcode instead."}
              {permissionState === "busy" &&
                "Another app is using the camera. Close it and try again, or upload a photo of the barcode."}
            </p>
          </div>
          {!isSecure && permissionState === "denied" && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 text-left">
              <b>This page is not loaded over HTTPS.</b> Browsers only allow camera access on secure (https://) sites.
              Open this app via <span className="font-mono">https://{host}</span> and try again.
            </p>
          )}
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 text-left">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={handleAllowCamera} className="w-full" disabled={!isSecure}>
              <Camera className="h-4 w-4 mr-2" />
              {permissionState === "idle" ? "Start camera" : "Allow camera"}
            </Button>
            {permissionState !== "idle" && (
              <Button variant="secondary" onClick={handleHardRestart} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" /> I've allowed it — restart camera
              </Button>
            )}
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
              <ImageIcon className="h-4 w-4 mr-2" /> Take / pick photo instead
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
            <summary className="cursor-pointer font-medium">How to unblock camera for {host || "this site"}</summary>
            <div className="mt-2 space-y-2">
              <p><b>Android Chrome (most common):</b></p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Tap <b>Allow camera</b> here first. Chrome only adds this site to Camera settings after the page asks for camera once.</li>
                <li>If the popup still does not appear, tap the <b>🔒</b> icon in the address bar → <b>Permissions</b> → set Camera to <b>Allow</b>.</li>
                <li>If the site is not listed there, open <b>⋮</b> → <b>Settings</b> → <b>Site settings</b> → <b>Camera</b>, keep <b>Site can ask for your camera</b> selected, then return here and tap <b>Allow camera</b> again.</li>
                <li>After allowing, tap <b>I've allowed it — restart camera</b>.</li>
                <li>If <span className="font-mono">{host || "this site"}</span> appears in the <b>Blocked</b> list, tap it.</li>
                <li>Tap <b>Reset permissions</b> or change Camera to <b>Allow</b>.</li>
              </ol>
              <p className="pt-2"><b>Faster alternative:</b> tap the <b>🔒 / ⓘ</b> icon left of the URL → <b>Permissions</b> → set Camera to <b>Allow</b> → reload.</p>
              <p className="pt-2"><b>iPhone (Safari):</b> Settings → Safari → Camera → Allow. Then reload this page. Also check Settings → Safari → Advanced → Website Data is not blocking the site.</p>
              <p><b>Desktop:</b> Click the lock icon next to the URL → set Camera to Allow → reload.</p>
              {!isSecure && (
                <p className="text-destructive pt-2"><b>Note:</b> Your address bar must show <b>https://</b>. If it shows http:// the camera will never work — ask your admin to enable HTTPS for {host}.</p>
              )}
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
