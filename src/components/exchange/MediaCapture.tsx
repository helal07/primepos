import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { uploadFile, signedUrl } from "@/lib/storage";
import { toast } from "sonner";
import { compressIfImage } from "@/lib/compressImage";

interface Props {
  label: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  tenantId: string;
  folder: string;
  enableCamera?: boolean;
  accept?: string;
}

export function MediaCapture({ label, value, onChange, tenantId, folder, enableCamera, accept = "image/*" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const upload = async (input: File) => {
    setBusy(true);
    try {
      const file = await compressIfImage(input, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { path } = await uploadFile("exchange-docs", file, { filename });
      const url = await signedUrl("exchange-docs", path, 60);
      onChange(url || path);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const startCam = async () => {
    try {
      setStreaming(true);
      // wait a tick for the <video> to mount
      await new Promise((r) => setTimeout(r, 50));
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute("playsinline", "true");
        try { await videoRef.current.play(); } catch {}
      }
    } catch (e: any) {
      setStreaming(false);
      toast.error(e?.message || "Camera access denied. Allow camera permission in browser settings.");
    }
  };

  const stopCam = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  };

  const snap = async () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob(async (b) => {
      if (!b) return;
      await upload(new File([b], "selfie.jpg", { type: "image/jpeg" }));
      stopCam();
    }, "image/jpeg", 0.85);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {value && (
        <div className="relative inline-block">
          <img src={value} alt={label} className="h-24 w-24 object-cover rounded border" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {streaming && (
        <div className="space-y-2">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-sm rounded border bg-black aspect-[3/4] object-cover"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={snap} disabled={busy}>Capture</Button>
            <Button type="button" size="sm" variant="outline" onClick={stopCam}>Cancel</Button>
          </div>
        </div>
      )}
      {!streaming && (
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-3.5 w-3.5 mr-1" /> {busy ? "Uploading…" : "Upload"}
          </Button>
          {enableCamera && (
            <Button type="button" size="sm" variant="outline" onClick={startCam} disabled={busy}>
              <Camera className="h-3.5 w-3.5 mr-1" /> Live Photo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}