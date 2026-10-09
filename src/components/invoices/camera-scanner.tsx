"use client";

import { Modal } from "@/components/ui/modal";
import { Camera, CameraOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "itf", "qr_code", "data_matrix"];

/** Native BarcodeDetector where the browser has one, otherwise the bundled zxing engine. */
async function createDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => Detector & { getSupportedFormats?: () => Promise<string[]> } })
    .BarcodeDetector;
  if (Native) {
    try {
      const supported = await (Native as unknown as { getSupportedFormats: () => Promise<string[]> }).getSupportedFormats();
      const formats = FORMATS.filter((f) => supported.includes(f));
      if (formats.length) return new Native({ formats });
    } catch {
      /* fall through to the bundled engine */
    }
  }
  const mod = await import("barcode-detector/ponyfill");
  mod.setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? `/scanner/${path}` : prefix + path),
  });
  return new mod.BarcodeDetector({ formats: FORMATS as never[] }) as unknown as Detector;
}

/**
 * Scan a product barcode with the phone or laptop camera. Calls onDetected once
 * per distinct code; the modal stays open so several items can be scanned in a row.
 */
export function CameraScanner({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "denied" | "unsupported">("starting");
  const [last, setLast] = useState<string | null>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let lastCode = "";
    let lastAt = 0;
    setStatus("starting");
    setLast(null);

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        setStatus("denied");
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      let detector: Detector;
      try {
        detector = await createDetector();
      } catch {
        setStatus("unsupported");
        return;
      }
      setStatus("scanning");

      const tick = async () => {
        if (stopped) return;
        if (video.readyState >= 2) {
          try {
            const codes = await detector.detect(video);
            const code = codes[0]?.rawValue?.trim();
            const now = Date.now();
            // Ignore the same code for 2 s so one scan adds one item
            if (code && (code !== lastCode || now - lastAt > 2000)) {
              lastCode = code;
              lastAt = now;
              setLast(code);
              navigator.vibrate?.(60);
              onDetectedRef.current(code);
            }
          } catch {
            /* frame not ready */
          }
        }
        raf = window.setTimeout(() => void tick(), 180) as unknown as number;
      };
      void tick();
    })();

    return () => {
      stopped = true;
      window.clearTimeout(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Scan with camera" size="md">
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-[14px] bg-black" style={{ aspectRatio: "4 / 3" }}>
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {status === "scanning" && (
            <div aria-hidden className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-[12px] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-rose-500/90" />
            </div>
          )}
          {status !== "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/85">
              {status === "starting" ? (
                <>
                  <Camera className="h-8 w-8 animate-pulse" /> Starting camera…
                </>
              ) : status === "denied" ? (
                <>
                  <CameraOff className="h-8 w-8" />
                  Camera access was blocked. Allow the camera for this site in your browser settings, then try again.
                </>
              ) : (
                <>
                  <CameraOff className="h-8 w-8" />
                  This browser can&apos;t use the camera for scanning. Type the barcode or use a USB scanner instead.
                </>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-slate" role="status" aria-live="polite">
          {last ? (
            <>
              Added <span className="font-mono font-semibold text-ink">{last}</span>. Scan the next item or close when done.
            </>
          ) : (
            "Hold the barcode inside the box. Each scan adds one to the invoice."
          )}
        </p>
      </div>
    </Modal>
  );
}
