"use client";

import { cn } from "@/lib/utils";
import { Camera, ImagePlus } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type SelfieCameraHandle = {
  /** Grab the current frame as a small JPEG data URL, or null if the camera isn't ready. */
  capture: () => string | null;
  ready: boolean;
};

const MAX_SIDE = 480;

function frameToJpeg(source: CanvasImageSource, w: number, h: number, mirror: boolean): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

/** Resize a picked image file to the same small JPEG the camera produces. */
export function fileToJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(frameToJpeg(img, img.naturalWidth, img.naturalHeight, false));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not a photo."));
    };
    img.src = url;
  });
}

/**
 * Front-camera preview for check-in selfies. Falls back to the phone's own
 * camera app (file picker) when live video is blocked or unavailable.
 */
export const SelfieCamera = forwardRef<
  SelfieCameraHandle,
  { className?: string; onFallbackPhoto?: (dataUrl: string) => void; round?: boolean }
>(function SelfieCamera({ className, onFallbackPhoto, round }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "live" | "blocked">("starting");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("blocked");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) return;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => undefined);
        }
        setState("live");
      } catch {
        if (!cancelled) setState("blocked");
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      ready: state === "live",
      capture: () => {
        const v = videoRef.current;
        if (state !== "live" || !v || !v.videoWidth) return null;
        return frameToJpeg(v, v.videoWidth, v.videoHeight, true);
      },
    }),
    [state]
  );

  return (
    <div
      className={cn(
        "relative flex aspect-square w-full items-center justify-center overflow-hidden bg-black/80",
        round ? "rounded-full" : "rounded-2xl",
        className
      )}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className={cn("h-full w-full -scale-x-100 object-cover", state !== "live" && "hidden")}
      />
      {state === "starting" && (
        <span className="flex flex-col items-center gap-2 text-sm text-white/70">
          <Camera className="h-8 w-8 animate-pulse" />
          Starting camera…
        </span>
      )}
      {state === "blocked" && (
        <label className="flex cursor-pointer flex-col items-center gap-2 px-6 text-center text-sm text-white/80">
          <ImagePlus className="h-8 w-8" />
          Camera is blocked here. Tap to take a photo instead.
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f && onFallbackPhoto) onFallbackPhoto(await fileToJpeg(f));
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
});
