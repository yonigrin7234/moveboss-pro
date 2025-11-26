"use client";

import { useState } from "react";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiPhotoFieldProps {
  name: string;
  label: string;
  description?: string;
  defaultValue?: string[];
  maxPhotos?: number;
  className?: string;
  onChange?: (urls: string[]) => void;
}

export function MultiPhotoField({
  name,
  label,
  description,
  defaultValue = [],
  maxPhotos = 10,
  className,
  onChange,
}: MultiPhotoFieldProps) {
  const [photos, setPhotos] = useState<string[]>(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result?.url) {
        throw new Error(result?.error || "Upload failed");
      }

      const newPhotos = [...photos, result.url];
      setPhotos(newPhotos);
      onChange?.(newPhotos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onChange?.(newPhotos);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground">
          {label}
          {photos.length > 0 && (
            <span className="ml-2 text-muted-foreground">({photos.length} uploaded)</span>
          )}
        </label>
        {photos.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Thumbnail grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((url, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-border"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f1f5f9' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='12'%3EError%3C/text%3E%3C/svg%3E";
                }}
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold shadow transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add photo button */}
      {photos.length < maxPhotos && (
        <label
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:border-muted-foreground",
            uploading && "opacity-70 pointer-events-none"
          )}
        >
          <Upload className="h-4 w-4" />
          <span>{uploading ? "Uploading..." : "+ Add photo"}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={JSON.stringify(photos)} />
    </div>
  );
}
