'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  Clock,
  Camera,
  Truck,
  Package,
  AlertTriangle,
} from 'lucide-react';

interface Photo {
  id: string;
  file_url: string;
  file_name: string | null;
  photo_type: string;
  caption: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onDelete?: (photoId: string) => Promise<void>;
  canDelete?: boolean;
}

export function PhotoGallery({
  photos,
  onDelete,
  canDelete = false,
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No photos yet</p>
      </div>
    );
  }

  const typeConfig: Record<
    string,
    { label: string; color: string; icon: React.ElementType }
  > = {
    loading: {
      label: 'Loading',
      color: 'bg-blue-500/20 text-blue-500',
      icon: Package,
    },
    loaded: {
      label: 'Loaded',
      color: 'bg-orange-500/20 text-orange-500',
      icon: Truck,
    },
    delivery: {
      label: 'Delivery',
      color: 'bg-green-500/20 text-green-500',
      icon: Package,
    },
    damage: {
      label: 'Damage',
      color: 'bg-red-500/20 text-red-500',
      icon: AlertTriangle,
    },
    other: {
      label: 'Other',
      color: 'bg-gray-500/20 text-gray-500',
      icon: Camera,
    },
  };

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  const goNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const goPrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => {
          const config = typeConfig[photo.photo_type] || typeConfig.other;

          return (
            <div
              key={photo.id}
              className="relative aspect-square cursor-pointer group"
              onClick={() => setSelectedIndex(index)}
            >
              <img
                src={photo.file_url}
                alt={photo.caption || `Photo ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
              <Badge
                className={`absolute bottom-1 left-1 text-xs ${config.color}`}
              >
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      <Dialog
        open={selectedIndex !== null}
        onOpenChange={() => setSelectedIndex(null)}
      >
        <DialogContent className="max-w-4xl p-0 bg-black/95">
          <DialogTitle className="sr-only">Photo Viewer</DialogTitle>

          {selectedPhoto && (
            <div className="relative">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                onClick={() => setSelectedIndex(null)}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Navigation */}
              {selectedIndex !== null && selectedIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              {selectedIndex !== null && selectedIndex < photos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}

              {/* Image */}
              <img
                src={selectedPhoto.file_url}
                alt={selectedPhoto.caption || 'Photo'}
                className="w-full max-h-[70vh] object-contain"
              />

              {/* Info bar */}
              <div className="p-4 bg-black text-white">
                <div className="flex items-center justify-between">
                  <div>
                    {selectedPhoto.caption && (
                      <p className="font-medium">{selectedPhoto.caption}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(selectedPhoto.created_at).toLocaleString()}
                      </span>
                      {selectedPhoto.latitude && selectedPhoto.longitude && (
                        <a
                          href={`https://maps.google.com/?q=${selectedPhoto.latitude},${selectedPhoto.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-white"
                        >
                          <MapPin className="h-3 w-3" />
                          View Location
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={selectedPhoto.file_url}
                        download={selectedPhoto.file_name}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </Button>
                    {canDelete && onDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          onDelete(selectedPhoto.id);
                          setSelectedIndex(null);
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                {/* Counter */}
                <p className="text-center text-sm text-gray-500 mt-2">
                  {(selectedIndex ?? 0) + 1} / {photos.length}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
