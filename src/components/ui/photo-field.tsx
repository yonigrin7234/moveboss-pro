"use client";

import { useId, useState } from "react";
import { Upload, Link as LinkIcon, CheckCircle2 } from "lucide-react";

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
  allowManualUrl = true,
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
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required ? <span className="text-red-500 ml-1">*</span> : null}
        </label>
        {value ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        ) : null}
      </div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}

      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3">
        <label
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-card/80",
            uploading && "opacity-70"
          )}
        >
          <Upload className="h-4 w-4 shrink-0" />
          <span>{uploading ? "Uploading..." : "Upload photo"}</span>
          <input
            id={id}
            name={`${name}_file_input`}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* Show URL input only when no photo - once uploaded, just show thumbnail */}
        {allowManualUrl && !value ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <input
              type="url"
              name={`${name}_url_fallback`}
              placeholder="Paste photo URL"
              className="w-full bg-transparent text-sm outline-none"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        ) : null}

        {/* Show thumbnail when photo exists */}
        {value ? (
          <div className="flex items-center gap-2">
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-border/70 bg-background p-1 hover:border-primary transition-colors"
            >
              <img
                src={value}
                alt="Uploaded photo"
                className="w-20 h-15 object-cover rounded"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </a>
            <button
              type="button"
              onClick={() => setValue("")}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          </div>
        ) : null}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <input type="hidden" name={name} value={value} required={required} />
    </div>
  );
}
