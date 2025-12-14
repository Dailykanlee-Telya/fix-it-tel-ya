import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OcrRequest {
  fileUrl: string;
  fileType: 'pdf' | 'image';
  ticketDraftId?: string;
}

interface ExtractedFields {
  customer_name: string | null;
  customer_street: string | null;
  customer_zip: string | null;
  customer_city: string | null;
  contract_number: string | null;
  claim_number: string | null;
  manufacturer: string | null;
  model: string | null;
  imei: string | null;
  error_description: string | null;
  damage_cause: string | null;
  damage_location: string | null;
  damage_datetime: string | null;
  damage_story: string | null;
}

interface OcrResponse {
  rawText: string | null;
  fields: ExtractedFields;
  error?: string;
}

// German label mappings for field extraction
const FIELD_LABELS: Record<keyof ExtractedFields, string[]> = {
  customer_name: ['kundenname', 'name', 'kunde', 'vor- und nachname', 'versicherungsnehmer'],
  customer_street: ['straße', 'strasse', 'anschrift', 'adresse'],
  customer_zip: ['plz', 'postleitzahl'],
  customer_city: ['ort', 'stadt', 'wohnort'],
  contract_number: ['vertragsnr', 'vertragsnummer', 'vertrags-nr', 'policennummer', 'police'],
  claim_number: ['schadennummer', 'schaden-nr', 'schadensnummer', 'schadennr'],
  manufacturer: ['hersteller', 'marke', 'fabrikat'],
  model: ['modell', 'gerätetyp', 'gerät', 'typ'],
  imei: ['imei', 'imei-nr', 'imei-nummer', 'seriennummer', 'gerätenummer'],
  error_description: ['fehler', 'fehlerbeschreibung', 'defekt', 'problem', 'störung'],
  damage_cause: ['schadenursache', 'ursache', 'schadensursache'],
  damage_location: ['schadenort', 'ort des schadens', 'schadensort'],
  damage_datetime: ['schadenzeitpunkt', 'datum', 'schadendatum', 'zeitpunkt'],
  damage_story: ['schadenhergang', 'hergang', 'beschreibung des schadens', 'schadenbeschreibung'],
};

// Validate IMEI with Luhn algorithm
function validateImei(imei: string): boolean {
  const digits = imei.replace(/\D/g, '');
  if (digits.length !== 15) return false;

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(digits[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// Extract IMEI from text
function extractImei(text: string): string | null {
  // Find all 15-digit number sequences
  const candidates = text.match(/\b\d{15}\b/g) || [];
  
  for (const candidate of candidates) {
    if (validateImei(candidate)) {
      return candidate;
    }
  }
  
  // Try without strict boundaries
  const allNumbers = text.match(/\d{15}/g) || [];
  for (const num of allNumbers) {
    if (validateImei(num)) {
      return num;
    }
  }
  
  return null;
}

// Extract field value from OCR text
function extractFieldValue(
  lines: string[],
  linesLower: string[],
  labels: string[],
  isMultiLine: boolean = false
): string | null {
  for (let i = 0; i < lines.length; i++) {
    const lineLower = linesLower[i];
    
    for (const label of labels) {
      const labelLower = label.toLowerCase();
      
      if (lineLower.includes(labelLower)) {
        // Try to extract value after colon
        const colonIndex = lines[i].indexOf(':');
        if (colonIndex !== -1) {
          let value = lines[i].substring(colonIndex + 1).trim();
          
          // For multi-line fields, append subsequent lines
          if (isMultiLine && value) {
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (!nextLine) break; // Empty line ends the block
              
              // Check if next line starts a new label
              const hasNewLabel = Object.values(FIELD_LABELS).flat().some(
                l => linesLower[j].includes(l.toLowerCase()) && lines[j].includes(':')
              );
              if (hasNewLabel) break;
              
              value += ' ' + nextLine;
            }
          }
          
          return value || null;
        }
        
        // Value might be on the next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !nextLine.includes(':')) {
            return nextLine;
          }
        }
      }
    }
  }
  
  return null;
}

// Extract ZIP and city from address block
function extractZipCity(text: string): { zip: string | null; city: string | null } {
  // Pattern: 5 digits followed by city name
  const match = text.match(/(\d{5})\s+([A-Za-zäöüÄÖÜß\s-]+)/);
  if (match) {
    return { zip: match[1], city: match[2].trim() };
  }
  return { zip: null, city: null };
}

// Parse OCR text into structured fields
function parseOcrText(rawText: string): ExtractedFields {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  const linesLower = lines.map(l => l.toLowerCase());
  
  const fields: ExtractedFields = {
    customer_name: null,
    customer_street: null,
    customer_zip: null,
    customer_city: null,
    contract_number: null,
    claim_number: null,
    manufacturer: null,
    model: null,
    imei: null,
    error_description: null,
    damage_cause: null,
    damage_location: null,
    damage_datetime: null,
    damage_story: null,
  };
  
  // Extract each field using labels
  fields.customer_name = extractFieldValue(lines, linesLower, FIELD_LABELS.customer_name);
  fields.customer_street = extractFieldValue(lines, linesLower, FIELD_LABELS.customer_street);
  fields.contract_number = extractFieldValue(lines, linesLower, FIELD_LABELS.contract_number);
  fields.claim_number = extractFieldValue(lines, linesLower, FIELD_LABELS.claim_number);
  fields.manufacturer = extractFieldValue(lines, linesLower, FIELD_LABELS.manufacturer);
  fields.model = extractFieldValue(lines, linesLower, FIELD_LABELS.model);
  fields.error_description = extractFieldValue(lines, linesLower, FIELD_LABELS.error_description, true);
  fields.damage_cause = extractFieldValue(lines, linesLower, FIELD_LABELS.damage_cause);
  fields.damage_location = extractFieldValue(lines, linesLower, FIELD_LABELS.damage_location);
  fields.damage_datetime = extractFieldValue(lines, linesLower, FIELD_LABELS.damage_datetime);
  fields.damage_story = extractFieldValue(lines, linesLower, FIELD_LABELS.damage_story, true);
  
  // Extract IMEI with validation
  fields.imei = extractImei(rawText);
  
  // Try to extract ZIP and city from full text if not found
  if (!fields.customer_zip || !fields.customer_city) {
    const zipCity = extractZipCity(rawText);
    if (!fields.customer_zip) fields.customer_zip = zipCity.zip;
    if (!fields.customer_city) fields.customer_city = zipCity.city;
  }
  
  return fields;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: OcrRequest = await req.json();
    const { fileUrl, fileType } = body;
    
    console.log('OCR intake request:', { fileUrl, fileType });
    
    if (!fileUrl) {
      return new Response(
        JSON.stringify({ rawText: null, fields: {}, error: 'FILE_URL_REQUIRED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI (Gemini) for OCR via vision capabilities
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ rawText: null, fields: {}, error: 'OCR_NOT_CONFIGURED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For PDF files, we need to inform the user that only images are supported for now
    if (fileType === 'pdf') {
      console.log('PDF detected - attempting OCR with vision model');
    }

    // Fetch the file and convert to base64
    let base64Data: string;
    let mimeType: string;
    
    try {
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.status}`);
      }
      
      const arrayBuffer = await fileResponse.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      base64Data = btoa(String.fromCharCode(...uint8Array));
      
      // Determine MIME type
      const contentType = fileResponse.headers.get('content-type') || '';
      if (contentType.includes('pdf')) {
        mimeType = 'application/pdf';
      } else if (contentType.includes('png')) {
        mimeType = 'image/png';
      } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        mimeType = 'image/jpeg';
      } else {
        mimeType = fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
      }
    } catch (fetchError) {
      console.error('Error fetching file:', fetchError);
      return new Response(
        JSON.stringify({ rawText: null, fields: {}, error: 'FILE_FETCH_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI with vision capabilities for OCR
    const ocrPrompt = `Du bist ein OCR-System für deutsche Versicherungs- und Reparaturformulare. 
Extrahiere ALLE lesbaren Texte aus diesem Dokument.

Fokussiere dich besonders auf folgende Felder (wenn vorhanden):
- Kundendaten: Name, Straße, PLZ, Ort
- Vertragsnummer / Policennummer
- Schadennummer
- Gerätedaten: Hersteller, Modell, IMEI
- Fehlerbeschreibung / Defekt
- Schadenursache, Schadenort, Schadenzeitpunkt, Schadenhergang

Gib den gesamten erkannten Text zurück, strukturiert und lesbar.
Markiere erkannte Feldnamen mit Doppelpunkt, z.B. "Hersteller: Apple".`;

    try {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: ocrPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('Lovable AI OCR error:', aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ rawText: null, fields: {}, error: 'RATE_LIMIT_EXCEEDED' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ rawText: null, fields: {}, error: 'OCR_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const aiData = await aiResponse.json();
      const rawText = aiData.choices?.[0]?.message?.content || '';
      
      console.log('OCR raw text extracted, length:', rawText.length);
      
      if (!rawText) {
        return new Response(
          JSON.stringify({ rawText: null, fields: {}, error: 'NO_TEXT_EXTRACTED' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse the extracted text into structured fields
      const fields = parseOcrText(rawText);
      
      console.log('OCR parsed fields:', JSON.stringify(fields, null, 2));

      const response: OcrResponse = {
        rawText,
        fields,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (aiError) {
      console.error('AI OCR processing error:', aiError);
      return new Response(
        JSON.stringify({ rawText: null, fields: {}, error: 'OCR_PROCESSING_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in ocr-intake function:', error);
    return new Response(
      JSON.stringify({ rawText: null, fields: {}, error: error.message || 'UNKNOWN_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
