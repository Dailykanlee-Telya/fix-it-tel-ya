import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ChevronDown, Copy, Eye, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';
import { B2BDocumentTemplate } from '@/types/b2b';

// Available placeholders for B2B document templates
const PLACEHOLDER_CATEGORIES = {
  'Auftrag': [
    { key: '{{auftragsnummer}}', description: 'Auftragsnummer des Tickets' },
    { key: '{{tracking_code}}', description: 'Tracking-Code für Kundenportal' },
    { key: '{{erstelldatum}}', description: 'Datum der Auftragserstellung' },
    { key: '{{status}}', description: 'Aktueller Auftragsstatus' },
    { key: '{{prioritaet}}', description: 'Priorität (Normal/Eilauftrag)' },
  ],
  'Gerät': [
    { key: '{{geraetetyp}}', description: 'Art des Geräts (Smartphone, Tablet, etc.)' },
    { key: '{{hersteller}}', description: 'Gerätehersteller' },
    { key: '{{modell}}', description: 'Gerätemodell' },
    { key: '{{imei}}', description: 'IMEI-Nummer' },
    { key: '{{seriennummer}}', description: 'Seriennummer' },
    { key: '{{farbe}}', description: 'Gerätefarbe' },
    { key: '{{zubehoer}}', description: 'Mitgegebenes Zubehör' },
    { key: '{{zustand}}', description: 'Zustand bei Annahme' },
  ],
  'Reparatur': [
    { key: '{{fehlercode}}', description: 'Gewählter Fehlercode' },
    { key: '{{fehlerbeschreibung}}', description: 'Detaillierte Fehlerbeschreibung' },
    { key: '{{reparaturbeschreibung}}', description: 'Durchgeführte Arbeiten' },
    { key: '{{diagnose}}', description: 'Techniker-Diagnose' },
    { key: '{{techniker}}', description: 'Name des Technikers' },
  ],
  'Preise': [
    { key: '{{endkundenpreis}}', description: 'Preis für Endkunden (wenn freigegeben)' },
    { key: '{{interne_kosten}}', description: 'Interne Kosten (B2B-Preis)' },
    { key: '{{teilekosten}}', description: 'Summe der verwendeten Teile' },
    { key: '{{arbeitskosten}}', description: 'Reine Arbeitskosten' },
    { key: '{{gesamtpreis}}', description: 'Gesamtbetrag' },
  ],
  'Endkunde': [
    { key: '{{endkunde_vorname}}', description: 'Vorname des Endkunden' },
    { key: '{{endkunde_nachname}}', description: 'Nachname des Endkunden' },
    { key: '{{endkunde_name}}', description: 'Vollständiger Name des Endkunden' },
    { key: '{{endkunde_strasse}}', description: 'Straße des Endkunden' },
    { key: '{{endkunde_plz}}', description: 'PLZ des Endkunden' },
    { key: '{{endkunde_ort}}', description: 'Ort des Endkunden' },
    { key: '{{endkunde_telefon}}', description: 'Telefon des Endkunden' },
    { key: '{{endkunde_email}}', description: 'E-Mail des Endkunden' },
    { key: '{{endkunde_referenz}}', description: 'Ihre Referenznummer für den Endkunden' },
  ],
  'Partner': [
    { key: '{{partner_name}}', description: 'Ihr Firmenname' },
    { key: '{{partner_strasse}}', description: 'Ihre Straße' },
    { key: '{{partner_plz}}', description: 'Ihre PLZ' },
    { key: '{{partner_ort}}', description: 'Ihr Ort' },
    { key: '{{partner_kundennummer}}', description: 'Ihre Kundennummer bei Telya' },
    { key: '{{partner_slogan}}', description: 'Ihr Slogan' },
    { key: '{{partner_telefon}}', description: 'Ihre Telefonnummer' },
    { key: '{{partner_email}}', description: 'Ihre E-Mail-Adresse' },
  ],
  'Datum/Zeit': [
    { key: '{{datum}}', description: 'Aktuelles Datum' },
    { key: '{{uhrzeit}}', description: 'Aktuelle Uhrzeit' },
    { key: '{{datum_uhrzeit}}', description: 'Datum und Uhrzeit' },
    { key: '{{kw}}', description: 'Aktuelle Kalenderwoche' },
  ],
};

interface B2BDocumentTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: B2BDocumentTemplate | null;
  templateType: string;
  onSave: (formData: {
    title: string;
    intro: string;
    conditions: string;
    footer: string;
    legal_text: string;
  }) => void;
  isSaving: boolean;
}

export function B2BDocumentTemplateEditor({
  open,
  onOpenChange,
  template,
  templateType,
  onSave,
  isSaving,
}: B2BDocumentTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState('edit');
  const [placeholdersOpen, setPlaceholdersOpen] = useState(true);
  const [formData, setFormData] = useState({
    title: template?.title || templateType,
    intro: template?.intro || '',
    conditions: template?.conditions || '',
    footer: template?.footer || '',
    legal_text: template?.legal_text || '',
  });

  // Reset form when template changes
  useState(() => {
    setFormData({
      title: template?.title || templateType,
      intro: template?.intro || '',
      conditions: template?.conditions || '',
      footer: template?.footer || '',
      legal_text: template?.legal_text || '',
    });
  });

  const copyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success(`${key} kopiert`);
  };

  // Generate simple preview with placeholder replacements
  const generatePreview = () => {
    const sampleData: Record<string, string> = {
      '{{auftragsnummer}}': 'TEBO250001',
      '{{tracking_code}}': 'ABC1234',
      '{{erstelldatum}}': new Date().toLocaleDateString('de-DE'),
      '{{status}}': 'In Bearbeitung',
      '{{prioritaet}}': 'Normal',
      '{{geraetetyp}}': 'Smartphone',
      '{{hersteller}}': 'Apple',
      '{{modell}}': 'iPhone 14 Pro',
      '{{imei}}': '123456789012345',
      '{{seriennummer}}': 'SN123456',
      '{{farbe}}': 'Space Black',
      '{{zubehoer}}': 'Ladekabel, Hülle',
      '{{zustand}}': 'Kratzer auf Rückseite',
      '{{fehlercode}}': 'Display defekt',
      '{{fehlerbeschreibung}}': 'Display zeigt schwarze Flecken und reagiert nicht mehr auf Touch-Eingaben.',
      '{{reparaturbeschreibung}}': 'Display ausgetauscht, Funktionstest durchgeführt.',
      '{{diagnose}}': 'Display-Modul defekt durch Sturz.',
      '{{techniker}}': 'Max Mustermann',
      '{{endkundenpreis}}': '199,00 €',
      '{{interne_kosten}}': '149,00 €',
      '{{teilekosten}}': '99,00 €',
      '{{arbeitskosten}}': '50,00 €',
      '{{gesamtpreis}}': '199,00 €',
      '{{endkunde_vorname}}': 'Hans',
      '{{endkunde_nachname}}': 'Müller',
      '{{endkunde_name}}': 'Hans Müller',
      '{{endkunde_strasse}}': 'Musterstraße 1',
      '{{endkunde_plz}}': '12345',
      '{{endkunde_ort}}': 'Musterstadt',
      '{{endkunde_telefon}}': '0171 1234567',
      '{{endkunde_email}}': 'hans.mueller@beispiel.de',
      '{{endkunde_referenz}}': 'REF-2025-001',
      '{{partner_name}}': 'Ihr Unternehmen GmbH',
      '{{partner_strasse}}': 'Partnerstraße 10',
      '{{partner_plz}}': '54321',
      '{{partner_ort}}': 'Partnerstadt',
      '{{partner_kundennummer}}': 'KD-12345',
      '{{partner_slogan}}': 'Ihr Partner für Reparaturen',
      '{{partner_telefon}}': '0800 1234567',
      '{{partner_email}}': 'kontakt@partner.de',
      '{{datum}}': new Date().toLocaleDateString('de-DE'),
      '{{uhrzeit}}': new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      '{{datum_uhrzeit}}': new Date().toLocaleString('de-DE'),
      '{{kw}}': `KW ${Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`,
    };

    const replaceAll = (text: string) => {
      let result = text;
      Object.entries(sampleData).forEach(([key, value]) => {
        result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
      });
      return result;
    };

    return {
      title: replaceAll(formData.title),
      intro: replaceAll(formData.intro),
      conditions: replaceAll(formData.conditions),
      footer: replaceAll(formData.footer),
      legal_text: replaceAll(formData.legal_text),
    };
  };

  const preview = generatePreview();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {template ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}
          </DialogTitle>
          <DialogDescription>
            Verwenden Sie Platzhalter wie {'{{auftragsnummer}}'} für dynamische Inhalte
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="edit">Bearbeiten</TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Vorschau
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 min-h-0 mt-4">
            <div className="grid grid-cols-3 gap-4 h-full">
              {/* Form Fields */}
              <div className="col-span-2">
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Titel</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                        placeholder="Dokumenttitel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Einleitung</Label>
                      <Textarea
                        value={formData.intro}
                        onChange={(e) => setFormData(f => ({ ...f, intro: e.target.value }))}
                        placeholder="Einleitungstext für das Dokument..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bedingungen</Label>
                      <Textarea
                        value={formData.conditions}
                        onChange={(e) => setFormData(f => ({ ...f, conditions: e.target.value }))}
                        placeholder="Reparaturbedingungen, AGB-Auszug..."
                        rows={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rechtlicher Text</Label>
                      <Textarea
                        value={formData.legal_text}
                        onChange={(e) => setFormData(f => ({ ...f, legal_text: e.target.value }))}
                        placeholder="Haftungshinweise, DSGVO-Text..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fußzeile</Label>
                      <Textarea
                        value={formData.footer}
                        onChange={(e) => setFormData(f => ({ ...f, footer: e.target.value }))}
                        placeholder="Fußzeilen-Text..."
                        rows={2}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Placeholder Reference */}
              <div className="col-span-1">
                <Collapsible open={placeholdersOpen} onOpenChange={setPlaceholdersOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium mb-2 w-full justify-between p-2 rounded hover:bg-muted">
                    <span className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Verfügbare Platzhalter
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${placeholdersOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-[45vh]">
                      <div className="space-y-3 pr-2">
                        {Object.entries(PLACEHOLDER_CATEGORIES).map(([category, placeholders]) => (
                          <div key={category}>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              {category}
                            </h4>
                            <div className="space-y-1">
                              {placeholders.map(({ key, description }) => (
                                <button
                                  key={key}
                                  onClick={() => copyPlaceholder(key)}
                                  className="w-full text-left p-1.5 rounded text-xs hover:bg-muted group transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <code className="bg-muted px-1 py-0.5 rounded font-mono text-[10px]">
                                      {key}
                                    </code>
                                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                                  </div>
                                  <p className="text-muted-foreground mt-0.5 line-clamp-1">
                                    {description}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[50vh]">
              <div className="bg-white dark:bg-zinc-900 border rounded-lg p-6 space-y-4">
                {preview.title && (
                  <h1 className="text-xl font-bold text-center border-b pb-4">
                    {preview.title}
                  </h1>
                )}
                {preview.intro && (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{preview.intro}</p>
                  </div>
                )}
                {preview.conditions && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Bedingungen</h3>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {preview.conditions}
                    </p>
                  </div>
                )}
                {preview.legal_text && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Rechtliche Hinweise</h3>
                    <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                      {preview.legal_text}
                    </p>
                  </div>
                )}
                {preview.footer && (
                  <div className="border-t pt-4 text-center text-xs text-muted-foreground">
                    {preview.footer}
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              Dies ist eine Vorschau mit Beispieldaten. Im echten Dokument werden die Platzhalter durch die tatsächlichen Auftragsdaten ersetzt.
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={() => onSave(formData)} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
