"use client";

import { useEffect, useState, useRef } from "react";
import { Camera, X, Loader2, ZoomIn } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

type PhotoType = "BEFORE" | "AFTER";

interface Photo {
  id: string;
  jobId: string;
  type: PhotoType;
  imageUrl: string;
  caption?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface JobPhotosProps {
  jobId: string;
  isAssignedCleaner: boolean;
}

// Image compression utility function
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Calculate dimensions maintaining aspect ratio
          const maxWidth = 800;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

          resolve(dataUrl);
        };

        img.onerror = () => {
          reject(new Error("Failed to load image"));
        };

        img.src = e.target?.result as string;
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
};

export const JobPhotos = ({ jobId, isAssignedCleaner }: JobPhotosProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState<PhotoType | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing photos
  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/photos?jobId=${jobId}&full=true`);

      if (!response.ok) {
        console.error("Failed to fetch photos");
        return;
      }

      const data = await response.json();
      setPhotos(Array.isArray(data) ? data : data.photos || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [jobId]);

  const handleUpload = async (type: PhotoType, file: File) => {
    try {
      setUploading(true);
      setUploadingType(type);

      // Compress the image
      const base64 = await compressImage(file);

      // Upload to API
      const response = await fetch("/api/photos/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          base64,
          jobId,
          caption: "",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to upload photo");
        return;
      }

      // Refresh the photo list
      await fetchPhotos();

      // Reset file input
      if (type === "BEFORE" && beforeInputRef.current) {
        beforeInputRef.current.value = "";
      } else if (type === "AFTER" && afterInputRef.current) {
        afterInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
      setUploadingType(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: PhotoType) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(type, file);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        alert("Failed to delete photo");
        return;
      }

      // Refresh the photo list
      await fetchPhotos();
      setShowModal(false);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete photo");
    }
  };

  const beforePhotos = photos.filter((p) => p.type === "BEFORE");
  const afterPhotos = photos.filter((p) => p.type === "AFTER");

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      {/* Before/After Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* BEFORE SECTION */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-accent">Before</h3>

          {/* Upload Button */}
          {isAssignedCleaner && (
            <>
              <button
                onClick={() => beforeInputRef.current?.click()}
                disabled={uploading && uploadingType === "BEFORE"}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-6 text-center transition-colors hover:border-accent hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading && uploadingType === "BEFORE" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <span className="text-sm font-medium text-accent">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5 text-accent" />
                    <span className="text-sm font-medium text-accent">Add Before Photo</span>
                  </>
                )}
              </button>
              <input
                ref={beforeInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileSelect(e, "BEFORE")}
                className="hidden"
              />
            </>
          )}

          {/* Before Photos Grid */}
          <div className="space-y-3">
            {beforePhotos.length === 0 ? (
              <div className="rounded-2xl bg-brand-50 border border-brand-200 p-4 text-center text-sm text-muted-foreground">
                No before photos yet
              </div>
            ) : (
              beforePhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden border border-brand-200">
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={photo.imageUrl}
                      alt={`Before photo for job ${jobId}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <button
                        onClick={() => {
                          setSelectedPhoto(photo);
                          setShowModal(true);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-gray-200"
                        title="View full size"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </button>

                      {isAssignedCleaner && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                          title="Delete photo"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-xs text-muted-foreground">{formatDate(photo.uploadedAt)}</p>
                    {photo.caption && <p className="text-sm text-foreground mt-1">{photo.caption}</p>}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* AFTER SECTION */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-accent">After</h3>

          {/* Upload Button */}
          {isAssignedCleaner && (
            <>
              <button
                onClick={() => afterInputRef.current?.click()}
                disabled={uploading && uploadingType === "AFTER"}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-6 text-center transition-colors hover:border-accent hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading && uploadingType === "AFTER" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <span className="text-sm font-medium text-accent">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5 text-accent" />
                    <span className="text-sm font-medium text-accent">Add After Photo</span>
                  </>
                )}
              </button>
              <input
                ref={afterInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileSelect(e, "AFTER")}
                className="hidden"
              />
            </>
          )}

          {/* After Photos Grid */}
          <div className="space-y-3">
            {afterPhotos.length === 0 ? (
              <div className="rounded-2xl bg-brand-50 border border-brand-200 p-4 text-center text-sm text-muted-foreground">
                No after photos yet
              </div>
            ) : (
              afterPhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden border border-brand-200">
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={photo.imageUrl}
                      alt={`After photo for job ${jobId}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <button
                        onClick={() => {
                          setSelectedPhoto(photo);
                          setShowModal(true);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-gray-200"
                        title="View full size"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </button>

                      {isAssignedCleaner && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                          title="Delete photo"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-xs text-muted-foreground">{formatDate(photo.uploadedAt)}</p>
                    {photo.caption && <p className="text-sm text-foreground mt-1">{photo.caption}</p>}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full-Size Photo Modal */}
      {showModal && selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] rounded-2xl bg-white overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              {isAssignedCleaner && (
                <button
                  onClick={() => handleDeletePhoto(selectedPhoto.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                  title="Delete photo"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-gray-200"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center bg-black min-h-[200px]">
              <img
                src={selectedPhoto.imageUrl}
                alt={`${selectedPhoto.type} photo`}
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
            </div>

            {/* Info Footer */}
            <div className="bg-white border-t border-brand-200 px-6 py-4">
              <p className="text-sm font-medium text-accent mb-1">
                {selectedPhoto.type === "BEFORE" ? "Before" : "After"} Photo
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(selectedPhoto.uploadedAt)}</p>
              {selectedPhoto.caption && <p className="text-sm text-foreground mt-2">{selectedPhoto.caption}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
