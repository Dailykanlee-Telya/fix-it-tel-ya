import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StickyNote, Plus, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface TicketInternalNotesProps {
  ticketId: string;
}

interface InternalNote {
  id: string;
  note_text: string;
  created_at: string;
  user_id: string;
  user_name?: string;
}

export default function TicketInternalNotes({ ticketId }: TicketInternalNotesProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');

  // Fetch internal notes with user names
  const { data: notes, isLoading } = useQuery({
    queryKey: ['ticket-internal-notes', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_internal_notes')
        .select('id, note_text, created_at, user_id')
        .eq('repair_ticket_id', ticketId)
        .order('created_at', { ascending: true }); // Oldest first (chronological)

      if (error) throw error;

      // Get user names
      const userIds = [...new Set(data.map(n => n.user_id))];
      let userNames: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        if (profiles) {
          userNames = profiles.reduce((acc, p) => {
            acc[p.id] = p.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return data.map(note => ({
        ...note,
        user_name: userNames[note.user_id] || 'Unbekannt'
      })) as InternalNote[];
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const { error } = await supabase
        .from('ticket_internal_notes')
        .insert({
          repair_ticket_id: ticketId,
          user_id: profile?.id,
          note_text: noteText.trim(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['ticket-internal-notes', ticketId] });
      toast({
        title: 'Notiz hinzugefügt',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Notiz konnte nicht gespeichert werden',
      });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate(newNote);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          Interne Notizen
        </CardTitle>
        <CardDescription>
          Chronologischer Verlauf aller internen Notizen (nur für Mitarbeiter sichtbar)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notes && notes.length > 0 ? (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg bg-muted/50 border border-muted"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{note.user_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(note.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap pl-8">{note.note_text}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Noch keine internen Notizen</p>
            </div>
          )}
        </div>

        {/* Add Note Form */}
        <div className="flex gap-2 pt-4 border-t">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Neue interne Notiz hinzufügen..."
            rows={2}
            className="flex-1"
            maxLength={2000}
          />
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim() || addNoteMutation.isPending}
            className="gap-2"
          >
            {addNoteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Hinzufügen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
