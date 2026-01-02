import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  Loader2,
  Save,
  Edit,
  Eye,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NotificationTemplate {
  id: string;
  channel: string;
  trigger: string;
  subject: string | null;
  body: string;
  active: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  'TICKET_CREATED': 'Auftragsbestätigung',
  'KVA_READY': 'KVA bereit',
  'KVA_APPROVED': 'KVA genehmigt',
  'KVA_REJECTED': 'KVA abgelehnt',
  'REPAIR_IN_PROGRESS': 'Reparatur gestartet',
  'READY_FOR_PICKUP': 'Abholbereit',
  'REMINDER_NOT_PICKED': 'Erinnerung Abholung',
  'KVA_REMINDER': 'KVA Ablauf-Erinnerung',
};

const PLACEHOLDER_INFO = `Verfügbare Platzhalter:
• {{customer_name}} - Kundenname
• {{ticket_number}} - Auftragsnummer
• {{device_info}} - Geräteinformation
• {{estimated_price}} - Geschätzte Kosten
• {{valid_until}} - Gültig bis (für KVA)
• {{tracking_url}} - Link zur Tracking-Seite`;

export function NotificationTemplatesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('channel', 'EMAIL')
        .order('trigger');

      if (error) throw error;
      return data as NotificationTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingTemplate) return;
      
      const { error } = await supabase
        .from('notification_templates')
        .update({
          subject: editSubject,
          body: editBody,
          active: editActive,
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setEditingTemplate(null);
      toast({
        title: 'Template gespeichert',
        description: 'Das E-Mail-Template wurde erfolgreich aktualisiert.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('notification_templates')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setEditSubject(template.subject || '');
    setEditBody(template.body);
    setEditActive(template.active);
  };

  const getPreviewHtml = () => {
    return editBody
      .replace(/\{\{customer_name\}\}/g, 'Max Mustermann')
      .replace(/\{\{ticket_number\}\}/g, 'TEBO250001')
      .replace(/\{\{device_info\}\}/g, 'Apple iPhone 14 Pro')
      .replace(/\{\{estimated_price\}\}/g, '129.00')
      .replace(/\{\{valid_until\}\}/g, '15.01.2025')
      .replace(/\{\{tracking_url\}\}/g, '#');
  };

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            E-Mail-Vorlagen
          </CardTitle>
          <CardDescription>
            Automatische E-Mail-Benachrichtigungen konfigurieren und anpassen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates?.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {TRIGGER_LABELS[template.trigger] || template.trigger}
                    </span>
                    <Badge variant={template.active ? 'default' : 'secondary'}>
                      {template.active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                  {template.subject && (
                    <p className="text-sm text-muted-foreground truncate max-w-md">
                      {template.subject}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={template.active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: template.id, active: checked })
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Button>
                </div>
              </div>
            ))}

            {(!templates || templates.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Keine E-Mail-Vorlagen vorhanden
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              E-Mail-Vorlage bearbeiten: {editingTemplate && TRIGGER_LABELS[editingTemplate.trigger]}
            </DialogTitle>
            <DialogDescription>
              Passen Sie den Inhalt der automatischen E-Mail an.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={editActive}
                  onCheckedChange={setEditActive}
                />
                <Label htmlFor="active">Template aktiv</Label>
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Info className="h-4 w-4 mr-1" />
                      Platzhalter
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm whitespace-pre-line">
                    {PLACEHOLDER_INFO}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Betreff</Label>
              <Input
                id="subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="E-Mail-Betreff"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Inhalt (HTML)</Label>
              <Textarea
                id="body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="E-Mail-Inhalt als HTML"
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setPreviewOpen(true)}
              className="w-full"
            >
              <Eye className="h-4 w-4 mr-2" />
              Vorschau anzeigen
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Abbrechen
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>E-Mail Vorschau</DialogTitle>
            <DialogDescription>
              So wird die E-Mail für Kunden aussehen (mit Beispieldaten)
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg p-4 bg-white">
            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-muted-foreground">Betreff:</p>
              <p className="font-medium">
                {editSubject
                  .replace(/\{\{customer_name\}\}/g, 'Max Mustermann')
                  .replace(/\{\{ticket_number\}\}/g, 'TEBO250001')
                  .replace(/\{\{device_info\}\}/g, 'Apple iPhone 14 Pro')
                  .replace(/\{\{estimated_price\}\}/g, '129.00')
                  .replace(/\{\{valid_until\}\}/g, '15.01.2025')}
              </p>
            </div>
            <div
              className="email-preview"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
          </div>

          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
