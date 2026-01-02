import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Camera, Image, Loader2, Plus, Eye, EyeOff, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

interface TicketPhotosProps {
  ticketId: string;
  showUpload?: boolean;
}

const PHOTO_CATEGORIES = {
  GERAETEZUSTAND: 'Gerätezustand',
  FLUESSIGKEITSSCHADEN: 'Flüssigkeitsschaden',
  MECHANISCHER_SCHADEN: 'Mechanischer Schaden',
  DISPLAY: 'Display',
  SONSTIGES: 'Sonstiges',
};

// Helper to extract file path from storage URL
const extractFilePath = (storageUrl: string): string | null => {
  try {
    const url = new URL(storageUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/ticket-photos\/(.+)/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    // If it's already just a path
    if (storageUrl.includes('ticket-photos/')) {
      return storageUrl.split('ticket-photos/')[1];
    }
    return null;
  }
};

export default function TicketPhotos({ ticketId, showUpload = true }: TicketPhotosProps) {
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('GERAETEZUSTAND');
  const [note, setNote] = useState<string>('');
  const [customerVisible, setCustomerVisible] = useState(false);

  const { data: photos, isLoading } = useQuery({
    queryKey: ['ticket-photos', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_photos')
        .select('*')
        .eq('repair_ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Generate signed URLs for each photo (bucket is now private)
      const photosWithSignedUrls = await Promise.all(
        (data || []).map(async (photo) => {
          const filePath = extractFilePath(photo.storage_url);
          if (filePath) {
            const { data: signedData } = await supabase.storage
              .from('ticket-photos')
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            return { ...photo, signedUrl: signedData?.signedUrl || photo.storage_url };
          }
          return { ...photo, signedUrl: photo.storage_url };
        })
      );
      
      return photosWithSignedUrls;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Keine Datei ausgewählt');
      
      setUploading(true);
      
      // Generate unique file name
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${ticketId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ticket-photos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get the storage URL
      const { data: urlData } = supabase.storage
        .from('ticket-photos')
        .getPublicUrl(fileName);

      // Insert into ticket_photos table
      const { error: insertError } = await supabase
        .from('ticket_photos')
        .insert({
          repair_ticket_id: ticketId,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          storage_url: urlData.publicUrl,
          category,
          note: note || null,
          customer_visible: customerVisible,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-photos', ticketId] });
      toast.success('Foto erfolgreich hochgeladen');
      resetUploadForm();
      setUploadDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Fehler beim Hochladen: ' + error.message);
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: async ({ photoId, updates }: { photoId: string; updates: { category?: string; note?: string; customer_visible?: boolean } }) => {
      const { error } = await supabase
        .from('ticket_photos')
        .update(updates)
        .eq('id', photoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-photos', ticketId] });
      toast.success('Foto aktualisiert');
    },
    onError: (error: any) => {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    },
  });

  const resetUploadForm = () => {
    setSelectedFile(null);
    setCategory('GERAETEZUSTAND');
    setNote('');
    setCustomerVisible(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Nur Bilddateien sind erlaubt');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Maximale Dateigröße: 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const toggleVisibility = (photo: any) => {
    updatePhotoMutation.mutate({
      photoId: photo.id,
      updates: { customer_visible: !photo.customer_visible },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Fotos / Dokumentation
            </CardTitle>
            <CardDescription>
              Dokumentation des Gerätezustands
            </CardDescription>
          </div>
          {showUpload && (
            <Button size="sm" className="gap-2" onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Foto hinzufügen
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <Dialog key={photo.id}>
                <DialogTrigger asChild>
                  <div
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border bg-muted group"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.signedUrl}
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      {photo.customer_visible && (
                        <Badge variant="secondary" className="text-xs bg-primary/80 text-primary-foreground">
                          <Eye className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <Badge variant="secondary" className="text-xs mb-1">
                        {PHOTO_CATEGORIES[photo.category as keyof typeof PHOTO_CATEGORIES] || photo.category}
                      </Badge>
                      <p className="text-xs text-white truncate">
                        {format(new Date(photo.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </p>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-3xl p-0 overflow-hidden">
                  <div className="relative">
                    <img
                      src={photo.signedUrl}
                      alt={photo.file_name}
                      className="w-full h-auto max-h-[60vh] object-contain bg-black"
                    />
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          {PHOTO_CATEGORIES[photo.category as keyof typeof PHOTO_CATEGORIES] || photo.category}
                        </Badge>
                        <Button
                          variant={photo.customer_visible ? 'default' : 'outline'}
                          size="sm"
                          className="gap-2"
                          onClick={() => toggleVisibility(photo)}
                          disabled={updatePhotoMutation.isPending}
                        >
                          {photo.customer_visible ? (
                            <>
                              <Eye className="h-4 w-4" />
                              Kundensichtbar
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4" />
                              Nur intern
                            </>
                          )}
                        </Button>
                      </div>
                      {photo.note && (
                        <p className="text-sm text-muted-foreground">{photo.note}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {photo.file_name} • {format(new Date(photo.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine Fotos vorhanden</p>
            {showUpload && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Erstes Foto hochladen
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto hochladen</DialogTitle>
            <DialogDescription>
              Laden Sie ein Foto zur Dokumentation hoch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>Foto auswählen</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PHOTO_CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>Notiz (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="z.B. 'Wasserschaden sichtbar unter der Displayfolie'"
                rows={2}
              />
            </div>

            {/* Customer Visibility */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="font-medium">Kundensichtbar</Label>
                <p className="text-xs text-muted-foreground">
                  Foto im Kundentracking anzeigen
                </p>
              </div>
              <Switch
                checked={customerVisible}
                onCheckedChange={setCustomerVisible}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!selectedFile || uploading}
            >
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Hochladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
