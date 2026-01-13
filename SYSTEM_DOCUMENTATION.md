# TECHNISCHE SYSTEMBESCHREIBUNG: Telya Reparatur- & B2B-Management-System

## 1. SYSTEM-ÜBERBLICK

### Zweck
Webbasierte Plattform zur Verwaltung von Reparaturaufträgen für elektronische Geräte (Handys, Tablets, Laptops, Smartwatches). Zwei Betriebsmodelle:
1. **Interner Betrieb**: Direkte Kundenannahme, Diagnose, Reparatur, Ausgabe
2. **B2B-Versandgeschäft**: Externe Partner senden Geräte ein, Telya repariert, Rückversand

### Zielgruppen
| Rolle | Beschreibung |
|-------|-------------|
| Endkunde | Besitzer des Geräts; nutzt öffentliches Tracking |
| Filial-Mitarbeiter | Theke, Techniker, Filialleiter |
| Administrator | Vollzugriff, Systemkonfiguration |
| B2B-Partner | Externes Unternehmen; sendet Geräte ein |

### Abgrenzung: Intern vs. B2B
| Aspekt | Internes System | B2B-Portal |
|--------|-----------------|------------|
| URL-Präfix | `/dashboard`, `/tickets` | `/b2b/*` |
| Kundenstamm | `customers` | `b2b_customers` |
| Preisanzeige | Endpreis | Intern-Preis + Endkundenpreis |

---

## 2. ROLLEN & RECHTE

### Interne Rollen
- **ADMIN**: Vollzugriff
- **FILIALLEITER**: Standort-Reports, Benutzer
- **TECHNIKER**: Workshop, Teile, Reparaturen
- **THEKE**: Annahme, Ausgabe, Kunden
- **BUCHHALTUNG**: Finanzreports (nur lesen)

### B2B-Rollen
- **B2B_INHABER**: Vollzugriff im Mandant, Mitarbeiterverwaltung
- **B2B_ADMIN**: Aufträge, Preisfreigaben
- **B2B_USER**: Aufträge anlegen, Nachrichten

### Mandantentrennung
Alle B2B-Daten strikt an `b2b_partner_id` gebunden via RLS.

---

## 3. DATENMODELL (Kerntabellen)

- **repair_tickets**: Zentrale Auftragsentität
- **customers / b2b_customers**: Kundenstammdaten
- **devices**: Gerätedaten
- **b2b_partners**: Partner mit Branding
- **kva_estimates**: Kostenvoranschläge (versioniert)
- **b2b_shipments**: Sendungsverwaltung
- **ticket_messages**: Nachrichten
- **ticket_internal_notes**: Interne Notizen
- **parts / stock_movements**: Lagerverwaltung
- **status_history**: Vollständige Statushistorie

---

## 4. STATUS-WORKFLOW

```
NEU_EINGEGANGEN → IN_DIAGNOSE → WARTET_AUF_FREIGABE → FREIGEGEBEN → IN_REPARATUR → FERTIG_ZUR_ABHOLUNG → ABGEHOLT
```

B2B-Erweiterungen: `EINGESENDET`, `RUECKVERSAND_AN_B2B`, `RUECKVERSAND_AN_ENDKUNDE`

**Regeln**: Rückwärts nur mit Begründung. Nach ABGEHOLT keine Änderungen.

---

## 5. KVA-MODUL

- Versionierung (Version 1, 2, 3...)
- Preise: `total_cost` (intern), `internal_price` (B2B), `endcustomer_price`
- Status: ENTWURF → ERSTELLT → GESENDET → FREIGEGEBEN/ABGELEHNT
- Automatischer Ticket-Status-Wechsel bei Freigabe

---

## 6. B2B-FUNKTIONEN

- Aufträge anlegen mit eigenem Kundenstamm
- Modell-Anfragen (Admin genehmigt)
- Sendungsverwaltung (INBOUND/OUTBOUND)
- Whitelabel-Dokumente (Logo, Farben, Texte)

---

## 7. SICHERHEIT & RLS

- `auth.uid() IS NOT NULL` in allen Policies
- Helper-Funktionen: `is_employee()`, `is_b2b_user()`, `get_b2b_partner_id()`
- XSS-Schutz mit DOMPurify

---

## 8. ARCHITEKTUR-EMPFEHLUNG

**Übernehmen**: Rollen-System, Status-Workflow, KVA-Versionierung, Mandantentrennung

**Anders lösen**: Dokumentengenerierung server-seitig, Echtzeit via Supabase Realtime, Geräte-Katalog hierarchisch

---

*Vollständige Dokumentation - Version 1.0*
