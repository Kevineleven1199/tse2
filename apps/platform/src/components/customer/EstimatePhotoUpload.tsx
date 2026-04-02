"use client";

import { useState, useRef } from "react";

interface Photo {
  id: string;
  imageUrl: string;
  caption: string;
}

interface EstimatePhotoUploadProps {
  sessionId: string;
  onPhotosChange?: (photos: Photo[]) => void;
}

export default function EstimatePhotoUpload({
  sessionId,
  onPhotosChange,
}: EstimatePhotoUploadProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 1200;
          const scale = Math.min(1, maxWidth / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    const newPhotos: Photo[] = [];

    for (const file of Array.from(files)) {
      try {
        const base64 = await compressImage(file);
        const res = await fetch("/api/estimate-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, sessionId, caption: file.name }),
        });

        if (res.ok) {
          const data = await res.json();
          newPhotos.push({ id: data.id, imageUrl: base64, caption: file.name });
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    const updated = [...photos, ...newPhotos];
    setPhotos(updated);
    onPhotosChange?.(updated);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    setPhotos(updated);
    onPhotosChange?.(updated);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Photos of your space (optional, up to 10)
      </label>
      <p className="text-xs text-gray-500">
        Upload photos to help us give you an accurate estimate
      </p>

      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative w-24 h-24 rounded-lg overflow-hidden border"
          >
            <img
              src={photo.imageUrl}
              alt={photo.caption}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => removePhoto(photo.id)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < 10 && (
          <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
            {uploading ? (
              <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full" />
            ) : (
              <>
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-xs text-gray-400 mt-1">Add photo</span>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {photos.length > 0 && (
        <p className="text-xs text-green-600">
          {photos.length} photo{photos.length !== 1 ? "s" : ""} uploaded
        </p>
      )}
    </div>
  );
}
