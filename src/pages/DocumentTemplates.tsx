import React, { useState } from 'react';
import { useDocumentTemplates, useUpdateDocumentTemplate } from '@/hooks/useDocumentTemplates';
import { 
  DOCUMENT_TYPE_LABELS, 
  AVAILABLE_PLACEHOLDERS,
  DocumentTemplate 
} from '@/lib/document-placeholders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Edit, Eye, Loader2, Copy, Check } from 'lucide-react';
import DocumentPreviewDialog from '@/components/documents/DocumentPreviewDialog';

export default function DocumentTemplates() {
  const { data: templates, isLoading } = useDocumentTemplates();
  const updateTemplate = useUpdateDocumentTemplate();
  
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    intro: '',
    conditions: '',
    footer: '',
  });
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'title' | 'intro' | 'conditions' | 'footer' | null>(null);

  const handleEdit = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title || '',
      intro: template.intro || '',
      conditions: template.conditions || '',
      footer: template.footer || '',
    });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    
    await updateTemplate.mutateAsync({
      id: editingTemplate.id,
      title: formData.title,
      intro: formData.intro || null,
      conditions: formData.conditions || null,
      footer: formData.footer || null,
    });
    
    setEditingTemplate(null);
  };

  const handleCancel = () => {
    setEditingTemplate(null);
  };

  const insertPlaceholder = (placeholder: string) => {
    if (!activeField) {
      // Copy to clipboard if no field is active
      navigator.clipboard.writeText(placeholder);
      setCopiedPlaceholder(placeholder);
      setTimeout(() => setCopiedPlaceholder(null), 2000);
      return;
    }

    const textarea = document.getElementById(`field-${activeField}`) as HTMLTextAreaElement | HTMLInputElement;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentValue = formData[activeField];
    const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
    
    setFormData({ ...formData, [activeField]: newValue });
    
    // Set cursor position after placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Dokumentenvorlagen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie die Texte für Ihre Dokumente (Eingangsbeleg, KVA, etc.)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vorlagen</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dokumenttyp</TableHead>
                <TableHead>Sprache</TableHead>
                <TableHead>Zuletzt geändert</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    {DOCUMENT_TYPE_LABELS[template.type] || template.type}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Deutsch</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(template.updated_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPreviewType(template.type)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Vorschau
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Bearbeiten
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => handleCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate && DOCUMENT_TYPE_LABELS[editingTemplate.type]} bearbeiten
            </DialogTitle>
            <DialogDescription>
              Passen Sie die Texte für dieses Dokument an. Verwenden Sie Platzhalter für dynamische Inhalte.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex gap-4 flex-1 overflow-hidden">
            {/* Form Fields */}
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="field-title">Titel</Label>
                <Input
                  id="field-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  onFocus={() => setActiveField('title')}
                  placeholder="Dokumenttitel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-intro">Einleitungstext</Label>
                <Textarea
                  id="field-intro"
                  value={formData.intro}
                  onChange={(e) => setFormData({ ...formData, intro: e.target.value })}
                  onFocus={() => setActiveField('intro')}
                  placeholder="Text der zu Beginn des Dokuments erscheint..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-conditions">Hinweistext / Bedingungen</Label>
                <Textarea
                  id="field-conditions"
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  onFocus={() => setActiveField('conditions')}
                  placeholder="Hinweise, Bedingungen, rechtliche Texte..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-footer">Fußzeile</Label>
                <Textarea
                  id="field-footer"
                  value={formData.footer}
                  onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                  onFocus={() => setActiveField('footer')}
                  placeholder="Firmeninformationen für die Fußzeile..."
                  rows={2}
                />
              </div>
            </div>

            {/* Placeholders Panel */}
            <div className="w-72 border-l pl-4">
              <div className="sticky top-0">
                <h4 className="font-semibold mb-2 text-sm">Verfügbare Platzhalter</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Klicken Sie auf einen Platzhalter, um ihn an der Cursorposition einzufügen.
                </p>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1 pr-2">
                    {AVAILABLE_PLACEHOLDERS.map((p) => (
                      <button
                        key={p.key}
                        className="w-full text-left p-2 rounded hover:bg-muted transition-colors text-sm group"
                        onClick={() => insertPlaceholder(p.label)}
                        title={p.description}
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {p.label}
                          </code>
                          {copiedPlaceholder === p.label ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateTemplate.isPending}
            >
              {updateTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <DocumentPreviewDialog
        type={previewType}
        open={!!previewType}
        onOpenChange={(open) => !open && setPreviewType(null)}
      />
    </div>
  );
}
