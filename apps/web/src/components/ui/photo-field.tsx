"use client";

import { useId, useState } from "react";
import { Upload, X, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface PhotoFieldProps {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  description?: string;
  className?: string;
  allowManualUrl?: boolean;
  onUploaded?: (url: string) => void;
}

export function PhotoField({
  name,
  label,
  required,
  defaultValue,
  description,
  className,
  onUploaded,
}: PhotoFieldProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
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

      setValue(result.url);
      onUploaded?.(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  const removePhoto = () => {
    setValue("");
    onUploaded?.("");
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {/* Show thumbnail when photo exists */}
      {value && (
        <div className="relative w-24 h-24">
          <img
            src={value}
            alt="Uploaded photo"
            className="w-full h-full object-cover rounded-lg border border-border"
            onError={(e) => {
              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f1f5f9' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='12'%3EError%3C/text%3E%3C/svg%3E";
            }}
          />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold shadow transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Show add button if no photo */}
      {!value && (
        <label
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:border-muted-foreground",
            uploading && "opacity-70 pointer-events-none"
          )}
        >
          <Upload className="h-4 w-4" />
          <span>{uploading ? "Uploading..." : "+ Add photo"}</span>
          <input
            id={id}
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

      <input type="hidden" name={name} value={value} required={required} />
    </div>
  );
}
