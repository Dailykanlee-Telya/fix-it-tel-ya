import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface ImportPreviewItem {
  row: number;
  sku: string;
  name: string;
  manufacturer: string;
  model: string | null;
  category: string;
  device_type: string;
  purchase_price: number;
  sales_price: number;
  stock_quantity: number;
  action: 'create' | 'update' | 'deactivate' | 'error';
  error?: string;
}

interface PartsImportExportProps {
  manufacturers: Array<{ id: string; name: string }>;
  parts: any[];
}

export default function PartsImportExport({ manufacturers, parts }: PartsImportExportProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Export to CSV - WITHOUT part_id/UUID
  const handleExport = () => {
    if (!parts || parts.length === 0) {
      toast({ variant: 'destructive', title: 'Keine Daten', description: 'Keine Ersatzteile zum Exportieren vorhanden.' });
      return;
    }

    const headers = [
      'sku',
      'name',
      'category',
      'device_type',
      'manufacturer',
      'model',
      'storage_location',
      'stock_quantity',
      'min_stock_quantity',
      'purchase_price',
      'sales_price',
      'active',
    ];

    const csvRows = [headers.join(';')];

    for (const part of parts) {
      const row = [
        part.sku || '',
        part.name || '',
        part.part_category || '',
        part.device_type || '',
        part.manufacturers?.name || part.brand || '',
        part.device_catalog?.model || part.model || '',
        part.storage_location || '',
        part.stock_quantity || 0,
        part.min_stock_quantity || 0,
        (part.purchase_price || 0).toString().replace('.', ','),
        (part.sales_price || 0).toString().replace('.', ','),
        part.is_active !== false ? 'Ja' : 'Nein',
      ];
      csvRows.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Telya_Ersatzteile_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'Export erfolgreich', description: `${parts.length} Ersatzteile exportiert.` });
  };

  // Parse CSV file
  const parseCSV = (content: string): string[][] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ';' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setPreviewData([]);

    try {
      const content = await file.text();
      const rows = parseCSV(content);
      
      if (rows.length < 2) {
        throw new Error('Datei enthält keine Daten (nur Header oder leer)');
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const skuIndex = headers.findIndex(h => h.includes('sku') || h.includes('art'));
      const nameIndex = headers.findIndex(h => h === 'name' || h.includes('bezeichnung'));
      const categoryIndex = headers.findIndex(h => h.includes('kategorie') || h.includes('category'));
      const deviceTypeIndex = headers.findIndex(h => h.includes('gerätetyp') || h.includes('device_type'));
      const manufacturerIndex = headers.findIndex(h => h.includes('hersteller') || h.includes('manufacturer'));
      const modelIndex = headers.findIndex(h => h.includes('modell') || h.includes('model'));
      const purchaseIndex = headers.findIndex(h => h.includes('einkauf') || h.includes('purchase'));
      const salesIndex = headers.findIndex(h => h.includes('verkauf') || h.includes('sales'));
      const stockIndex = headers.findIndex(h => h.includes('bestand') || h.includes('stock'));

      if (skuIndex === -1) {
        throw new Error('SKU-Spalte nicht gefunden. Bitte stellen Sie sicher, dass eine Spalte "sku" oder "art" enthält.');
      }

      const preview: ImportPreviewItem[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2 || !row[skuIndex]) continue;

        const sku = row[skuIndex].trim();
        const name = nameIndex !== -1 ? row[nameIndex] : '';
        const manufacturer = manufacturerIndex !== -1 ? row[manufacturerIndex] : '';
        const model = modelIndex !== -1 ? row[modelIndex] || null : null;
        const category = categoryIndex !== -1 ? row[categoryIndex] : '';
        const deviceType = deviceTypeIndex !== -1 ? row[deviceTypeIndex] : 'HANDY';
        const purchasePrice = purchaseIndex !== -1 ? parseFloat(row[purchaseIndex].replace(',', '.')) || 0 : 0;
        const salesPrice = salesIndex !== -1 ? parseFloat(row[salesIndex].replace(',', '.')) || 0 : 0;
        const stockQuantity = stockIndex !== -1 ? parseInt(row[stockIndex]) || 0 : 0;

        // Check if SKU already exists
        const existingPart = parts.find(p => p.sku === sku);

        const item: ImportPreviewItem = {
          row: i + 1,
          sku,
          name,
          manufacturer,
          model,
          category,
          device_type: deviceType,
          purchase_price: purchasePrice,
          sales_price: salesPrice,
          stock_quantity: stockQuantity,
          action: existingPart ? 'update' : 'create',
        };

        // Validate
        if (!sku) {
          item.action = 'error';
          item.error = 'SKU fehlt';
        } else if (!name && !existingPart) {
          item.action = 'error';
          item.error = 'Name fehlt für neues Teil';
        } else if (!manufacturer && !existingPart) {
          item.action = 'error';
          item.error = 'Hersteller fehlt für neues Teil';
        }

        preview.push(item);
      }

      setPreviewData(preview);
      setImportDialogOpen(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Fehler beim Lesen', description: error.message });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Commit import
  const handleCommitImport = async () => {
    const validItems = previewData.filter(p => p.action !== 'error');
    if (validItems.length === 0) {
      toast({ variant: 'destructive', title: 'Keine gültigen Daten', description: 'Keine Zeilen zum Importieren.' });
      return;
    }

    setIsCommitting(true);

    try {
      let created = 0;
      let updated = 0;

      for (const item of validItems) {
        // Find manufacturer by name
        const manufacturer = manufacturers.find(m => m.name.toLowerCase() === item.manufacturer.toLowerCase());

        if (item.action === 'create') {
          const { error } = await supabase.from('parts').insert({
            sku: item.sku,
            name: item.name,
            part_category: item.category.toUpperCase(),
            device_type: item.device_type.toUpperCase(),
            manufacturer_id: manufacturer?.id || null,
            brand: item.manufacturer,
            model: item.model,
            purchase_price: item.purchase_price,
            sales_price: item.sales_price,
            stock_quantity: item.stock_quantity,
            is_active: true,
          });
          if (error) throw error;
          created++;
        } else if (item.action === 'update') {
          const updateData: any = {};
          if (item.name) updateData.name = item.name;
          if (item.purchase_price) updateData.purchase_price = item.purchase_price;
          if (item.sales_price) updateData.sales_price = item.sales_price;
          if (item.stock_quantity !== undefined) updateData.stock_quantity = item.stock_quantity;
          if (item.manufacturer && manufacturer) updateData.manufacturer_id = manufacturer.id;
          
          if (Object.keys(updateData).length > 0) {
            const { error } = await supabase.from('parts').update(updateData).eq('sku', item.sku);
            if (error) throw error;
            updated++;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setImportDialogOpen(false);
      setPreviewData([]);
      toast({ title: 'Import erfolgreich', description: `${created} erstellt, ${updated} aktualisiert.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Import fehlgeschlagen', description: error.message });
    } finally {
      setIsCommitting(false);
    }
  };

  const createCount = previewData.filter(p => p.action === 'create').length;
  const updateCount = previewData.filter(p => p.action === 'update').length;
  const errorCount = previewData.filter(p => p.action === 'error').length;

  return (
    <>
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="gap-2">
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Import
        </Button>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import-Vorschau (Dry Run)
            </DialogTitle>
            <DialogDescription>
              Überprüfen Sie die Änderungen vor dem Import. Es werden keine Daten gelöscht, nur deaktiviert.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 py-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              {createCount} Neu
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Upload className="h-3 w-3 text-info" />
              {updateCount} Update
            </Badge>
            {errorCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {errorCount} Fehler
              </Badge>
            )}
          </div>

          <div className="border rounded-lg max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Zeile</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Hersteller</TableHead>
                  <TableHead>Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 100).map((item, idx) => (
                  <TableRow key={idx} className={item.action === 'error' ? 'bg-destructive/10' : ''}>
                    <TableCell className="font-mono text-xs">{item.row}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>{item.name || '-'}</TableCell>
                    <TableCell>{item.manufacturer || '-'}</TableCell>
                    <TableCell>
                      {item.action === 'create' && (
                        <Badge className="bg-success/10 text-success border-success/20">Neu</Badge>
                      )}
                      {item.action === 'update' && (
                        <Badge className="bg-info/10 text-info border-info/20">Update</Badge>
                      )}
                      {item.action === 'error' && (
                        <span className="text-destructive text-xs flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {item.error}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {previewData.length > 100 && (
            <p className="text-sm text-muted-foreground">
              Zeige 100 von {previewData.length} Zeilen...
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleCommitImport}
              disabled={isCommitting || (createCount === 0 && updateCount === 0)}
            >
              {isCommitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Import bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
