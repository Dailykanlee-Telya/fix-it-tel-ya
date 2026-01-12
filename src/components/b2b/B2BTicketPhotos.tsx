import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface B2BTicketPhotosProps {
  ticketId: string;
}

const PHOTO_CATEGORIES: Record<string, string> = {
  'intake': 'Annahme',
  'diagnosis': 'Diagnose',
  'repair': 'Reparatur',
  'completed': 'Fertigstellung',
  'other': 'Sonstiges',
};

export default function B2BTicketPhotos({ ticketId }: B2BTicketPhotosProps) {
  const { data: photos, isLoading } = useQuery({
    queryKey: ['b2b-ticket-photos', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_photos')
        .select('*')
        .eq('repair_ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for each photo
      const photosWithUrls = await Promise.all(
        data.map(async (photo) => {
          const { data: urlData } = await supabase.storage
            .from('ticket-photos')
            .createSignedUrl(photo.storage_url, 3600);
          
          return {
            ...photo,
            signedUrl: urlData?.signedUrl || null,
          };
        })
      );

      return photosWithUrls;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Keine Fotos vorhanden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Fotos ({photos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <Dialog key={photo.id}>
              <DialogTrigger asChild>
                <button className="relative aspect-square rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all cursor-pointer">
                  {photo.signedUrl ? (
                    <img
                      src={photo.signedUrl}
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60">
                    <Badge variant="secondary" className="text-xs">
                      {PHOTO_CATEGORIES[photo.category] || photo.category}
                    </Badge>
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <div className="space-y-4">
                  {photo.signedUrl && (
                    <img
                      src={photo.signedUrl}
                      alt={photo.file_name}
                      className="w-full max-h-[70vh] object-contain rounded-lg"
                    />
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <Badge>{PHOTO_CATEGORIES[photo.category] || photo.category}</Badge>
                    <span>
                      {format(new Date(photo.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </span>
                  </div>
                  {photo.note && (
                    <p className="text-sm">{photo.note}</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
