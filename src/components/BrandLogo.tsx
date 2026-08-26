import { useEffect, useState, type ReactNode } from "react";
import { normalizeStorageUrl } from "@/lib/storage";

/**
 * Renders a logo image and falls back to the brand initial when the file is
 * missing (e.g. an old upload that no longer exists on disk), instead of the
 * browser's broken-image icon.
 */
export function BrandLogo({
  src,
  alt,
  fallback,
  className = "h-full w-full object-contain",
}: {
  src?: string | null;
  alt: string;
  fallback: ReactNode;
  className?: string;
}) {
  const url = normalizeStorageUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  if (!url || failed) return <>{fallback}</>;

  return <img src={url} alt={alt} className={className} onError={() => setFailed(true)} />;
}

