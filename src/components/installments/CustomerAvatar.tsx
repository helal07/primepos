import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/storage";

interface Props {
  path?: string | null;
  name?: string | null;
  className?: string;
}

/** Small avatar that resolves a private installment-docs path to a signed URL. */
export function CustomerAvatar({ path, name, className = "h-9 w-9" }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    if (path.startsWith("http")) { setUrl(path); return; }
    signedUrl("installment-docs", path, 60)
      .then((u) => { if (!cancelled) setUrl(u || null); })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [path]);

  const initials = (name || "?").trim().charAt(0).toUpperCase();

  return url ? (
    <img src={url} alt={name || "Customer"} className={`${className} rounded-full object-cover border`} />
  ) : (
    <div className={`${className} rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold border`}>
      {initials}
    </div>
  );
}
