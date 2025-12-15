-- Update document_templates with comprehensive German default texts
-- This migration updates existing templates if they exist, or inserts new ones

-- Update EINGANGSBELEG
UPDATE document_templates 
SET 
  title = 'EINGANGSBESTÄTIGUNG / AUFTRAG',
  intro = 'Wir haben Ihr Gerät im Telya Repair Management System mit folgenden Daten aufgenommen:',
  conditions = '**Wichtige Hinweise**

- **Datensicherung:**  
  Wir empfehlen dringend, vor der Reparatur eine eigene Datensicherung zu erstellen. Für Datenverlust übernehmen wir keine Haftung, außer bei grober Fahrlässigkeit.

- **Kostenvoranschlag (KVA):**  
  Sofern ein Kostenvoranschlag erforderlich ist, informieren wir Sie vorab.  
  Bei Nichtdurchführung der Reparatur kann eine KVA-Gebühr von {{kva_gebuehr_brutto}} inkl. MwSt. berechnet werden.  
  Bei Durchführung der Reparatur entfällt diese Gebühr.

- **Abholfrist / Lagerung:**  
  Geräte, die länger als 3 Monate nach Fertigstellung nicht abgeholt werden, können nach vorheriger Erinnerung entsorgt oder einer Verwertung zugeführt werden. Eventuelle Restwerte werden mit offenen Forderungen verrechnet.

- **Kontakt & Statusabfrage:**  
  Sie können den Reparaturstatus jederzeit online einsehen unter:  
  telya.repariert.de/track  
  Verwenden Sie dazu Ihre Auftragsnummer: {{auftragsnummer}}.',
  footer = 'Ich habe das oben genannte Gerät an Telya übergeben und die Hinweise zur Datensicherung, KVA-Gebühr und Abholfrist zur Kenntnis genommen.',
  updated_at = now()
WHERE type = 'EINGANGSBELEG' AND locale = 'de';

-- Update KVA
UPDATE document_templates 
SET 
  title = 'KOSTENVORANSCHLAG (KVA)',
  intro = 'Für den folgenden Auftrag haben wir eine Diagnose durchgeführt und unterbreiten Ihnen diesen Kostenvoranschlag. Bitte prüfen Sie die Angaben sorgfältig und wählen Sie anschließend eine der Optionen aus.',
  conditions = '**Diagnose & Kostenübersicht**

Der festgestellte Schaden und die empfohlene Maßnahme sind im Dokument und in der Tabelle oben aufgeführt.

**KVA-Gebühr bei Nichtreparatur**

Bei Nichtdurchführung der Reparatur berechnen wir eine KVA-Gebühr von {{kva_gebuehr_brutto}} inkl. MwSt.  
Bei Durchführung der Reparatur entfällt diese Gebühr.

**Ihre Optionen**

Bitte wählen Sie eine der folgenden Optionen:

1. Reparatur zum genannten Preis durchführen  
   → Ich bin mit der Reparatur zum Betrag von {{kva_betrag_brutto}} brutto einverstanden.

2. Gerät unrepariert zurückgeben / zurücksenden  
   → Ich wünsche keine Reparatur. Mir ist bekannt, dass eine KVA-Gebühr von {{kva_gebuehr_brutto}} inkl. MwSt. berechnet wird.

3. Gerät kostenfrei entsorgen  
   → Ich verzichte auf das Gerät und bin mit einer kostenlosen Entsorgung einverstanden.  
     Eine KVA-Gebühr von {{kva_gebuehr_brutto}} inkl. MwSt. wird dennoch berechnet.

**Gültigkeit**

Dieser Kostenvoranschlag ist 14 Tage gültig, sofern keine weiteren Schäden festgestellt werden. Sollten während der Reparatur zusätzliche Schäden erkennbar werden, informieren wir Sie vor Ausführung und erstellen ggf. einen aktualisierten KVA.',
  footer = 'Mit Freigabe dieses Kostenvoranschlags stimmen Sie der Durchführung der aufgeführten Reparaturarbeiten sowie den genannten Konditionen zu.',
  updated_at = now()
WHERE type = 'KVA' AND locale = 'de';

-- Update REPARATURBERICHT
UPDATE document_templates 
SET 
  title = 'REPARATURBERICHT / FERTIGMELDUNG',
  intro = 'Die Reparatur für den folgenden Auftrag wurde abgeschlossen. Nachfolgend finden Sie eine Übersicht der durchgeführten Arbeiten und Funktionsprüfungen.',
  conditions = '**Ergebnis der Reparatur**

Alle getesteten Funktionen des Geräts waren zum Zeitpunkt der Fertigstellung in ordnungsgemäßem Zustand. Details zur durchgeführten Reparatur und zu den verbauten Ersatzteilen entnehmen Sie bitte der Übersicht im Dokument.

**Hinweis zur Garantie / Gewährleistung**

Auf die verbaute(n) Komponente(n) gewähren wir eine Garantie auf Material- und Montagefehler gemäß unseren gültigen Bedingungen. Ausgenommen sind insbesondere Sturz-, Schlag- und Wasserschäden sowie unsachgemäße Nutzung.

Gesetzliche Gewährleistungsrechte bleiben unberührt.

Bitte prüfen Sie das Gerät bei Abholung bzw. Erhalt und informieren Sie uns zeitnah, falls Ihnen Unregelmäßigkeiten auffallen.',
  footer = 'Mit der Entgegennahme des Geräts bestätigen Sie den Erhalt des reparierten Geräts. Eventuelle Reklamationen teilen Sie uns bitte umgehend mit, unter Angabe der Auftragsnummer {{auftragsnummer}}.',
  updated_at = now()
WHERE type = 'REPARATURBERICHT' AND locale = 'de';

-- Update LIEFERSCHEIN
UPDATE document_templates 
SET 
  title = 'LIEFERSCHEIN / RÜCKSENDUNG',
  intro = 'Mit diesem Lieferschein bestätigen wir Ihnen den Versand bzw. die Rückgabe der nachfolgend aufgeführten Geräte.',
  conditions = '**Hinweise für den Empfänger**

- Bitte prüfen Sie die Sendung unverzüglich auf Vollständigkeit und Transportschäden.  
- Reklamationen zur Sendung teilen Sie uns bitte innerhalb von 7 Tagen nach Wareneingang mit.  
- Nutzen Sie bei Rückfragen bitte immer die Auftragsnummer {{auftragsnummer}}.

Der Versand erfolgt gemäß unseren vereinbarten Bedingungen. Die enthaltenen Geräte können repariert, unrepariert oder zur Entsorgung gekennzeichnet sein; Details entnehmen Sie bitte der Übersicht im Dokument.',
  footer = 'Empfang der Sendung bestätigt: Ort, Datum und Unterschrift / Stempel des Empfängers.',
  updated_at = now()
WHERE type = 'LIEFERSCHEIN' AND locale = 'de';