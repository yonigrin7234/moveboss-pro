'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Camera, FileText, Truck, Package, CheckCircle, X } from 'lucide-react';

interface PhotoGroup {
  title: string;
  icon: React.ReactNode;
  photos: Array<{ url: string; label?: string }>;
}

interface LoadPhotosProps {
  load: {
    // Loading photos
    loading_start_photo?: string | null;
    loading_end_photo?: string | null;
    loading_report_photo?: string | null;
    origin_paperwork_photos?: string[] | null;
    // Contract photos
    contract_photo_url?: string | null;
    contract_documents?: string[] | null;
    // Delivery photos
    delivery_report_photo_url?: string | null;
    delivery_location_photo?: string | null;
    delivery_photos?: string[] | null;
    // Signed documents
    signed_bol_photos?: string[] | null;
    signed_inventory_photos?: string[] | null;
    // Customer signature
    customer_signature?: string | null;
  };
}

export function LoadPhotos({ load }: LoadPhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Build photo groups
  const photoGroups: PhotoGroup[] = [];

  // Loading photos
  const loadingPhotos: Array<{ url: string; label?: string }> = [];
  if (load.loading_start_photo) {
    loadingPhotos.push({ url: load.loading_start_photo, label: 'Loading Start' });
  }
  if (load.loading_end_photo) {
    loadingPhotos.push({ url: load.loading_end_photo, label: 'Loading End' });
  }
  if (load.loading_report_photo) {
    loadingPhotos.push({ url: load.loading_report_photo, label: 'Loading Report' });
  }
  if (load.origin_paperwork_photos?.length) {
    load.origin_paperwork_photos.forEach((url, i) => {
      loadingPhotos.push({ url, label: `Paperwork ${i + 1}` });
    });
  }
  if (loadingPhotos.length > 0) {
    photoGroups.push({
      title: 'Loading Photos',
      icon: <Package className="h-4 w-4" />,
      photos: loadingPhotos,
    });
  }

  // Contract photos
  const contractPhotos: Array<{ url: string; label?: string }> = [];
  if (load.contract_photo_url) {
    contractPhotos.push({ url: load.contract_photo_url, label: 'Contract' });
  }
  if (load.contract_documents?.length) {
    load.contract_documents.forEach((url, i) => {
      contractPhotos.push({ url, label: `Document ${i + 1}` });
    });
  }
  if (contractPhotos.length > 0) {
    photoGroups.push({
      title: 'Contract & Documents',
      icon: <FileText className="h-4 w-4" />,
      photos: contractPhotos,
    });
  }

  // Delivery photos
  const deliveryPhotos: Array<{ url: string; label?: string }> = [];
  if (load.delivery_location_photo) {
    deliveryPhotos.push({ url: load.delivery_location_photo, label: 'Delivery Location' });
  }
  if (load.delivery_report_photo_url) {
    deliveryPhotos.push({ url: load.delivery_report_photo_url, label: 'Delivery Report' });
  }
  if (load.delivery_photos?.length) {
    load.delivery_photos.forEach((url, i) => {
      deliveryPhotos.push({ url, label: `Delivery ${i + 1}` });
    });
  }
  if (deliveryPhotos.length > 0) {
    photoGroups.push({
      title: 'Delivery Photos',
      icon: <Truck className="h-4 w-4" />,
      photos: deliveryPhotos,
    });
  }

  // Signed documents
  const signedDocs: Array<{ url: string; label?: string }> = [];
  if (load.signed_bol_photos?.length) {
    load.signed_bol_photos.forEach((url, i) => {
      signedDocs.push({ url, label: `Signed BOL ${i + 1}` });
    });
  }
  if (load.signed_inventory_photos?.length) {
    load.signed_inventory_photos.forEach((url, i) => {
      signedDocs.push({ url, label: `Signed Inventory ${i + 1}` });
    });
  }
  if (load.customer_signature) {
    signedDocs.push({ url: load.customer_signature, label: 'Customer Signature' });
  }
  if (signedDocs.length > 0) {
    photoGroups.push({
      title: 'Signed Documents',
      icon: <CheckCircle className="h-4 w-4" />,
      photos: signedDocs,
    });
  }

  // If no photos, don't render the section
  if (photoGroups.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Driver-Uploaded Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {photoGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                {group.icon}
                {group.title}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {group.photos.map((photo, idx) => (
                  <button
                    key={`${group.title}-${idx}`}
                    type="button"
                    onClick={() => setSelectedPhoto(photo.url)}
                    className="group relative aspect-square rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all"
                  >
                    <Image
                      src={photo.url}
                      alt={photo.label || 'Photo'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    />
                    {photo.label && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                        {photo.label}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Photo Preview</DialogTitle>
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>
          {selectedPhoto && (
            <div className="relative w-full h-[80vh]">
              <Image
                src={selectedPhoto}
                alt="Full size photo"
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
