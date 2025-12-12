import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Image, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TicketPhotosProps {
  ticketId: string;
}

export default function TicketPhotos({ ticketId }: TicketPhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { data: photos, isLoading } = useQuery({
    queryKey: ['ticket-photos', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_photos')
        .select('*')
        .eq('repair_ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

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
        <CardTitle className="text-lg flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Fotos
        </CardTitle>
        <CardDescription>
          Dokumentation des Gerätezustands bei Annahme
        </CardDescription>
      </CardHeader>
      <CardContent>
        {photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <Dialog key={photo.id}>
                <DialogTrigger asChild>
                  <div
                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border bg-muted"
                    onClick={() => setSelectedPhoto(photo.storage_url)}
                  >
                    <img
                      src={photo.storage_url}
                      alt={photo.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white truncate">
                        {format(new Date(photo.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </p>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-3xl p-0 overflow-hidden">
                  <div className="relative">
                    <img
                      src={photo.storage_url}
                      alt={photo.file_name}
                      className="w-full h-auto max-h-[80vh] object-contain"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3">
                      <p className="text-sm text-white">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
