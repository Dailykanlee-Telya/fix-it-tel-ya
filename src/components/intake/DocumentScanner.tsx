import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Camera, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface OcrExtractedFields {
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

interface DocumentScannerProps {
  onScanComplete: (fields: OcrExtractedFields, documentUrl: string, rawText: string) => void;
  onCancel: () => void;
}

export function DocumentScanner({ onScanComplete, onCancel }: DocumentScannerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Ungültiger Dateityp',
        description: 'Bitte laden Sie eine PDF- oder Bilddatei (JPG, PNG) hoch.',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Datei zu groß',
        description: 'Die Datei darf maximal 10 MB groß sein.',
      });
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(10);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `intake_${timestamp}.${extension}`;

      setProgress(30);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('intake_documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Datei konnte nicht hochgeladen werden.');
      }

      setProgress(50);
      setIsUploading(false);
      setIsProcessing(true);

      // Get public URL for the file
      const { data: urlData } = supabase.storage
        .from('intake_documents')
        .getPublicUrl(fileName);

      // For private buckets, we need a signed URL
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('intake_documents')
        .createSignedUrl(fileName, 3600); // 1 hour expiry

      const fileUrl = signedUrlData?.signedUrl || urlData.publicUrl;

      setProgress(60);

      // Call OCR Edge Function
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
      
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('ocr-intake', {
        body: { fileUrl, fileType },
      });

      setProgress(90);

      if (ocrError) {
        console.error('OCR error:', ocrError);
        throw new Error('OCR-Verarbeitung fehlgeschlagen.');
      }

      if (ocrResult?.error) {
        console.error('OCR result error:', ocrResult.error);
        
        if (ocrResult.error === 'RATE_LIMIT_EXCEEDED') {
          throw new Error('Zu viele Anfragen. Bitte versuchen Sie es später erneut.');
        } else if (ocrResult.error === 'NO_TEXT_EXTRACTED') {
          throw new Error('Kein Text im Dokument erkannt. Bitte prüfen Sie die Bildqualität.');
        } else {
          throw new Error('Der Beleg konnte nicht automatisch ausgelesen werden.');
        }
      }

      setProgress(100);

      // Success - return extracted fields
      const fields = ocrResult.fields || {};
      const rawText = ocrResult.rawText || '';

      // Store the document path for later reference
      const documentPath = uploadData.path;

      toast({
        title: 'Beleg erfolgreich gescannt',
        description: 'Die erkannten Daten wurden in das Formular übertragen.',
      });

      onScanComplete(fields, documentPath, rawText);

    } catch (err: any) {
      console.error('Document scanning error:', err);
      setError(err.message || 'Ein unbekannter Fehler ist aufgetreten.');
      
      toast({
        variant: 'destructive',
        title: 'Fehler beim Scannen',
        description: err.message || 'Der Beleg konnte nicht verarbeitet werden.',
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setProgress(0);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleContinueWithoutOcr = () => {
    // Allow user to continue with empty fields
    onScanComplete({
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
    }, '', '');
  };

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Beleg scannen / hochladen
          </DialogTitle>
          <DialogDescription>
            Laden Sie einen Versicherungsbeleg oder Schadenformular hoch. Die Daten werden automatisch erkannt und in das Auftragsformular übertragen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/jpg,image/png"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload/Processing State */}
          {(isUploading || isProcessing) ? (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">
                    {isUploading ? 'Datei wird hochgeladen...' : 'Beleg wird analysiert...'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isProcessing && 'OCR-Texterkennung läuft'}
                  </p>
                </div>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          ) : error ? (
            /* Error State */
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <div className="text-center">
                  <p className="font-medium text-destructive">Fehler beim Scannen</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Erneut versuchen
                </Button>
                <Button variant="outline" onClick={handleContinueWithoutOcr} className="w-full">
                  Manuell erfassen
                </Button>
              </div>
            </div>
          ) : (
            /* Initial State - Upload Options */
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <Button
                  size="lg"
                  className="h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8" />
                  <span>Datei hochladen</span>
                  <span className="text-xs opacity-70">PDF, JPG oder PNG</span>
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">oder</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full h-16 flex-col gap-1"
                onClick={() => {
                  // Trigger camera capture on mobile
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera className="h-6 w-6" />
                <span>Mit Kamera fotografieren</span>
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Unterstützte Formate: PDF, JPG, PNG (max. 10 MB)
              </p>
            </div>
          )}
        </div>

        {/* Cancel Button */}
        {!isUploading && !isProcessing && (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onCancel}>
              Abbrechen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
