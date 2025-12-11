import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X, Loader2, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  ticketId?: string;
  onPhotosChange?: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
}

export interface UploadedPhoto {
  file: File;
  preview: string;
  uploading?: boolean;
  uploaded?: boolean;
  storageUrl?: string;
}

export default function PhotoUpload({ ticketId, onPhotosChange, maxPhotos = 5 }: PhotoUploadProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    if (filesToAdd.length < files.length) {
      toast({
        title: 'Hinweis',
        description: `Maximal ${maxPhotos} Fotos erlaubt. Einige Fotos wurden nicht hinzugefügt.`,
      });
    }

    const newPhotos: UploadedPhoto[] = filesToAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    const updatedPhotos = [...photos, ...newPhotos];
    setPhotos(updatedPhotos);
    onPhotosChange?.(updatedPhotos);

    // Reset input
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    URL.revokeObjectURL(photo.preview);
    
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    onPhotosChange?.(updatedPhotos);
  };

  const uploadPhotosToStorage = async (repairTicketId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (photo.uploaded && photo.storageUrl) {
        uploadedUrls.push(photo.storageUrl);
        continue;
      }

      // Update state to show uploading
      setPhotos(prev => prev.map((p, idx) => 
        idx === i ? { ...p, uploading: true } : p
      ));

      const fileExt = photo.file.name.split('.').pop();
      const fileName = `${repairTicketId}/${Date.now()}-${i}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('ticket-photos')
        .upload(fileName, photo.file);

      if (error) {
        console.error('Error uploading photo:', error);
        toast({
          variant: 'destructive',
          title: 'Upload-Fehler',
          description: `Foto ${i + 1} konnte nicht hochgeladen werden.`,
        });
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('ticket-photos')
        .getPublicUrl(data.path);

      uploadedUrls.push(urlData.publicUrl);

      // Update state
      setPhotos(prev => prev.map((p, idx) => 
        idx === i ? { ...p, uploading: false, uploaded: true, storageUrl: urlData.publicUrl } : p
      ));
    }

    return uploadedUrls;
  };

  // Expose upload function via ref or callback
  React.useImperativeHandle(
    React.useRef(null),
    () => ({
      uploadPhotos: uploadPhotosToStorage,
      getPhotos: () => photos,
    }),
    [photos]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={photos.length >= maxPhotos}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Foto hochladen
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={photos.length >= maxPhotos}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          Foto aufnehmen
        </Button>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-0">
                <img
                  src={photo.preview}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-24 object-cover"
                />
                {photo.uploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
                {photo.uploaded && (
                  <div className="absolute bottom-1 right-1 h-5 w-5 bg-success rounded-full flex items-center justify-center">
                    <Image className="h-3 w-3 text-success-foreground" />
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {photos.length}/{maxPhotos} Fotos • Fotos werden nach Auftragsanlage hochgeladen
      </p>
    </div>
  );
}

// Hook for using photo upload
export function usePhotoUpload() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  const uploadPhotos = async (ticketId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      if (photo.uploaded && photo.storageUrl) {
        uploadedUrls.push(photo.storageUrl);
        continue;
      }

      const fileExt = photo.file.name.split('.').pop();
      const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('ticket-photos')
        .upload(fileName, photo.file);

      if (error) {
        console.error('Error uploading photo:', error);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('ticket-photos')
        .getPublicUrl(data.path);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const savePhotoRecords = async (ticketId: string, urls: string[]) => {
    for (const url of urls) {
      const fileName = url.split('/').pop() || 'photo';
      await supabase.from('ticket_photos').insert({
        repair_ticket_id: ticketId,
        storage_url: url,
        file_name: fileName,
      });
    }
  };

  return {
    photos,
    setPhotos,
    uploadPhotos,
    savePhotoRecords,
  };
}
