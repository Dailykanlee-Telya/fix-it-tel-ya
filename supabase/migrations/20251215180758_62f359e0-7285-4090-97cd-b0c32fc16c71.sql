-- Create document_templates table
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  locale text NOT NULL DEFAULT 'de',
  title text NOT NULL,
  intro text,
  conditions text,
  footer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(type, locale)
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Employees can view document templates"
  ON public.document_templates
  FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Admins can manage document templates"
  ON public.document_templates
  FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'));

-- Add updated_at trigger
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add new permission
INSERT INTO public.permissions (key, description, category)
VALUES ('MANAGE_DOCUMENT_TEMPLATES', 'Dokumentenvorlagen verwalten', 'admin')
ON CONFLICT (key) DO NOTHING;

-- Grant permission to ADMIN role
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('ADMIN', 'MANAGE_DOCUMENT_TEMPLATES')
ON CONFLICT DO NOTHING;

-- Seed default templates
INSERT INTO public.document_templates (type, locale, title, intro, conditions, footer) VALUES
(
  'EINGANGSBELEG',
  'de',
  'Eingangsbeleg',
  'Vielen Dank, dass Sie sich für die Telya GmbH entschieden haben. Wir haben Ihr Gerät zur Reparatur entgegengenommen.',
  'Haftungshinweis: Die Telya GmbH haftet nicht für Datenverlust. Bitte sichern Sie Ihre Daten vor der Reparatur. Bei Geräten mit Wasserschaden oder vorherigen Fremdreparaturen kann keine Garantie auf die Reparatur gegeben werden.

Datenschutz: Ihre Daten werden gemäß DSGVO verarbeitet und nur für die Durchführung der Reparatur verwendet.

Mit meiner Unterschrift bestätige ich die Abgabe des oben genannten Geräts zur Reparatur und erkenne die allgemeinen Geschäftsbedingungen der Telya GmbH an.',
  'Telya GmbH | Schalker Str. 59, 45881 Gelsenkirchen | Tel: 0209 88307161 | service@telya.de'
),
(
  'KVA',
  'de',
  'Kostenvoranschlag',
  'Auf Basis unserer Diagnose haben wir folgenden Kostenvoranschlag für Ihr Gerät {{geraet_hersteller}} {{geraet_modell}} erstellt.',
  'Gültigkeit: Dieser Kostenvoranschlag ist 14 Tage gültig. Die angegebenen Preise verstehen sich inkl. MwSt.

Hinweis: Nach Diagnose können sich die tatsächlichen Kosten ändern. Bei einer Abweichung von mehr als 15% werden wir Sie kontaktieren.

Bitte wählen Sie eine der folgenden Optionen:
☐ Reparatur durchführen (zu den oben genannten Kosten)
☐ Gerät unrepariert zurück (ggf. KVA-Gebühr: {{kva_gebuehr_brutto}})
☐ Gerät kostenlos entsorgen',
  'Telya GmbH | Schalker Str. 59, 45881 Gelsenkirchen | Tel: 0209 88307161 | service@telya.de'
),
(
  'REPARATURBERICHT',
  'de',
  'Reparaturbericht',
  'Die Reparatur Ihres Geräts {{geraet_hersteller}} {{geraet_modell}} wurde erfolgreich abgeschlossen.',
  'Garantie: Auf die durchgeführte Reparatur gewähren wir 6 Monate Garantie (ausgenommen Wasserschäden und mechanische Beschädigungen nach der Reparatur).

Mit meiner Unterschrift bestätige ich den Erhalt des reparierten Geräts und des oben aufgeführten Zubehörs in ordnungsgemäßem Zustand.',
  'Telya GmbH | Schalker Str. 59, 45881 Gelsenkirchen | Tel: 0209 88307161 | service@telya.de'
),
(
  'LIEFERSCHEIN',
  'de',
  'Lieferschein',
  'Hiermit übersenden wir Ihnen die nachfolgend aufgeführten Geräte nach erfolgter Reparatur.',
  'Bitte prüfen Sie die Sendung unmittelbar nach Erhalt auf Vollständigkeit und eventuelle Transportschäden. Reklamationen sind innerhalb von 3 Werktagen schriftlich anzuzeigen.

Garantie: Auf die durchgeführten Reparaturen gewähren wir 6 Monate Garantie (ausgenommen Wasserschäden und mechanische Beschädigungen nach Auslieferung).',
  'Telya GmbH | Schalker Str. 59, 45881 Gelsenkirchen | Tel: 0209 88307161 | service@telya.de'
)
ON CONFLICT (type, locale) DO NOTHING;