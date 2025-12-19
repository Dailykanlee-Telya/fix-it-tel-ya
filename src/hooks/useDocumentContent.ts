/**
 * Hook to provide document content from database templates
 * Single Source of Truth: Templates from DB are used for ALL documents
 * - Document preview in DocumentTemplates page
 * - Ticket documents (PDF generation)
 * - Printouts
 */

import { useDocumentTemplate } from './useDocumentTemplates';
import { replacePlaceholders, buildPlaceholderMap, DEFAULT_TEMPLATES } from '@/lib/document-placeholders';

export interface DocumentContent {
  title: string;
  intro: string;
  conditions: string;
  footer: string;
  isLoading: boolean;
}

export type DocumentType = 'EINGANGSBELEG' | 'KVA' | 'REPARATURBERICHT' | 'LIEFERSCHEIN';

/**
 * Get document content from database template with fallback to defaults
 * Pass ticket data to replace placeholders
 */
export function useDocumentContent(
  type: DocumentType, 
  ticketData?: any, 
  partUsage?: any[]
): DocumentContent {
  const { data: template, isLoading } = useDocumentTemplate(type);
  
  // Fallback to default template if not found in DB
  const defaultTemplate = DEFAULT_TEMPLATES[type];
  
  const baseContent = {
    title: template?.title || defaultTemplate?.title || '',
    intro: template?.intro || defaultTemplate?.intro || '',
    conditions: template?.conditions || defaultTemplate?.conditions || '',
    footer: template?.footer || defaultTemplate?.footer || '',
  };
  
  // If ticket data is provided, replace placeholders
  if (ticketData) {
    const placeholderMap = buildPlaceholderMap({ ticket: ticketData, partUsage });
    
    return {
      title: replacePlaceholders(baseContent.title, placeholderMap),
      intro: replacePlaceholders(baseContent.intro, placeholderMap),
      conditions: replacePlaceholders(baseContent.conditions, placeholderMap),
      footer: replacePlaceholders(baseContent.footer, placeholderMap),
      isLoading,
    };
  }
  
  return {
    ...baseContent,
    isLoading,
  };
}

/**
 * Get all document types that are used in orders
 * These are the ONLY templates shown in DocumentTemplates page
 */
export const USED_DOCUMENT_TYPES: DocumentType[] = [
  'EINGANGSBELEG',
  'KVA', 
  'REPARATURBERICHT',
  'LIEFERSCHEIN',
];
