import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Edit, Loader2, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AVAILABLE_PLACEHOLDERS } from '@/lib/document-placeholders';

// Get placeholders by document type
const getPlaceholdersByDocType = (docType: string) => {
  // All placeholders are available for all document types
  return AVAILABLE_PLACEHOLDERS;
};

// Document type labels
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'intake_receipt': 'Eingangsbeleg (A4)',
  'pickup_receipt': 'Abholschein / Bondruck',
  'kva': 'Kostenvoranschlag (KVA)',
  'delivery_note': 'Lieferschein (B2B)',
  'invoice': 'Rechnung',
};

export default function DocumentTemplates() {
  const queryClient = useQueryClient();
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formIntro, setFormIntro] = useState('');
  const [formConditions, setFormConditions] = useState('');
  const [formFooter, setFormFooter] = useState('');

  // Fetch all templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['document-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('locale', 'de')
        .order('type');
      if (error) throw error;
      return data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (template: { id: string; title: string; intro: string; conditions: string; footer: string }) => {
      const { error } = await supabase
        .from('document_templates')
        .update({
          title: template.title,
          intro: template.intro,
          conditions: template.conditions,
          footer: template.footer,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      setEditDialogOpen(false);
      toast.success('Vorlage wurde gespeichert.');
    },
    onError: () => {
      toast.error('Fehler beim Speichern der Vorlage.');
    },
  });

  const handleEditTemplate = (template: any) => {
    setEditTemplate(template);
    setFormTitle(template.title || '');
    setFormIntro(template.intro || '');
    setFormConditions(template.conditions || '');
    setFormFooter(template.footer || '');
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editTemplate) return;
    updateMutation.mutate({
      id: editTemplate.id,
      title: formTitle,
      intro: formIntro,
      conditions: formConditions,
      footer: formFooter,
    });
  };

  const availablePlaceholders = editTemplate ? getPlaceholdersByDocType(editTemplate.type) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dokumentenvorlagen</h1>
        <p className="text-muted-foreground">
          Bearbeiten Sie die Texte für Ihre Dokumente. Systemfelder wie Kunde, Gerät und Auftragsnummer werden automatisch eingefügt.
        </p>
      </div>

      {/* Info Box */}
      <Card className="bg-info/5 border-info/20">
        <CardContent className="pt-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-info mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Hinweis zur Bearbeitung</p>
            <p className="text-muted-foreground mt-1">
              Sie können die Texte für Datenschutz, Haftung, AGB-Hinweise und weitere Inhalte frei anpassen. 
              Platzhalter wie <code className="bg-muted px-1 rounded">{'{{KUNDE_NAME}}'}</code> werden beim Generieren automatisch ersetzt.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vorlagen
          </CardTitle>
          <CardDescription>
            Klicken Sie auf "Bearbeiten" um eine Vorlage anzupassen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dokumenttyp</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Zuletzt bearbeitet</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Keine Vorlagen gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template: any) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {DOCUMENT_TYPE_LABELS[template.type] || template.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{template.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(template.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(template)} className="gap-2">
                          <Edit className="h-4 w-4" />
                          Bearbeiten
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {editTemplate && (DOCUMENT_TYPE_LABELS[editTemplate.type] || editTemplate.type)} bearbeiten
            </DialogTitle>
            <DialogDescription>
              Passen Sie die Texte an. Platzhalter werden beim Generieren automatisch ersetzt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Dokumenttitel</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="z.B. Reparaturauftrag"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intro">Einleitungstext</Label>
              <Textarea
                id="intro"
                value={formIntro}
                onChange={(e) => setFormIntro(e.target.value)}
                placeholder="Text, der oben im Dokument erscheint..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditions">Bedingungen / Rechtstexte</Label>
              <Textarea
                id="conditions"
                value={formConditions}
                onChange={(e) => setFormConditions(e.target.value)}
                placeholder="Datenschutz, Haftung, AGB-Hinweise..."
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Hier können Sie Datenschutzhinweise, Haftungsausschlüsse und AGB-Verweise einfügen.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer">Fußzeile</Label>
              <Textarea
                id="footer"
                value={formFooter}
                onChange={(e) => setFormFooter(e.target.value)}
                placeholder="Text am Ende des Dokuments..."
                rows={3}
              />
            </div>

            {/* Available Placeholders */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium">Verfügbare Platzhalter</p>
              <div className="flex flex-wrap gap-2">
                {availablePlaceholders.length > 0 ? (
                  availablePlaceholders.slice(0, 15).map((ph) => (
                    <Badge 
                      key={ph.key} 
                      variant="secondary" 
                      className="font-mono text-xs cursor-pointer hover:bg-secondary/80"
                      onClick={() => {
                        navigator.clipboard.writeText(`{{${ph.key}}}`);
                        toast.info(`Platzhalter {{${ph.key}}} kopiert`);
                      }}
                      title={ph.description}
                    >
                      {`{{${ph.key}}}`}
                    </Badge>
                  ))
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Klicken zum Kopieren. Die Platzhalter werden beim Generieren durch echte Daten ersetzt.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
