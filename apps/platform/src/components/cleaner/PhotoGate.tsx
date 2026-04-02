"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2, Check, ChevronRight, ImagePlus } from "lucide-react";

type PhotoType = "BEFORE" | "AFTER";

interface PhotoGateProps {
  jobId: string;
  type: PhotoType;
  onComplete: () => void;
  onCancel: () => void;
}

/** Compress to 800px wide, 70% JPEG quality */
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));
        const maxW = 800;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });

export const PhotoGate = ({ jobId, type, onComplete, onCancel }: PhotoGateProps) => {
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isBefore = type === "BEFORE";
  const canProceed = photos.length >= 1;

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const base64 = await compressImage(file);

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, base64, jobId, caption: "" }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Upload failed");
        return;
      }

      const data = await res.json();
      setPhotos((prev) => [...prev, { id: data.id, url: data.imageUrl }]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [jobId, type]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ WebkitTapHighlightColor: "transparent" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Sheet */}
      <div
        className="relative mt-auto flex max-h-[92vh] flex-col overflow-hidden rounded-t-[28px] bg-white pb-[env(safe-area-inset-bottom)] animate-[slideUp_0.3s_ease-out]"
      >
        {/* Handle + Close */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-200" />
        </div>
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="px-6 pb-4 pt-2">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${
            isBefore ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
          }`}>
            <Camera className="h-3.5 w-3.5" />
            {isBefore ? "Before Photos" : "After Photos"}
          </div>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">
            {isBefore ? "Snap the space before you start" : "Show off your work!"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isBefore
              ? "Take at least 1 photo of the space before cleaning. This protects you and the client."
              : "Take at least 1 photo showing the finished result. Clients love seeing the difference!"}
          </p>
        </div>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                <img src={photo.url} alt="Uploaded" className="h-full w-full object-cover" />
                <div className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                  <Check className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}

            {/* Upload Slot */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400 transition active:scale-95 active:bg-gray-100 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              ) : (
                <ImagePlus className="h-8 w-8" />
              )}
              <span className="text-xs font-medium">
                {uploading ? "Uploading..." : "Add Photo"}
              </span>
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />

          {error && (
            <div className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-gray-100 px-6 pb-4 pt-4">
          {/* Camera CTA */}
          {photos.length === 0 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`mb-3 flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-5 text-lg font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50 ${
                isBefore ? "bg-blue-600 active:bg-blue-700" : "bg-green-600 active:bg-green-700"
              }`}
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Camera className="h-6 w-6" />
              )}
              {uploading ? "Uploading..." : "Open Camera"}
            </button>
          )}

          {/* Continue */}
          <button
            onClick={onComplete}
            disabled={!canProceed}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold transition active:scale-[0.98] disabled:opacity-30 ${
              canProceed
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            Continue
            <ChevronRight className="h-5 w-5" />
            {canProceed && (
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
