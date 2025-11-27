'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

interface PhotoUploadProps {
  onUpload: (file: File, caption?: string) => Promise<void>;
  maxPhotos?: number;
  currentCount?: number;
  label?: string;
  accept?: string;
}

export function PhotoUpload({
  onUpload,
  maxPhotos = 10,
  currentCount = 0,
  label = 'Add Photo',
  accept = 'image/*',
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload = currentCount < maxPhotos;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await onUpload(selectedFile, caption);
      // Reset
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  if (!canUpload) {
    return (
      <p className="text-sm text-muted-foreground">
        Maximum {maxPhotos} photos reached
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!preview ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            {label}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            capture="environment"
          />
        </div>
      ) : (
        <Card>
          <CardContent className="p-3 space-y-3">
            {/* Preview */}
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Caption */}
            <div>
              <Label htmlFor="caption" className="text-sm">
                Caption (optional)
              </Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe this photo..."
                className="mt-1"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                className="flex-1"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
