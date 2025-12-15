import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DocumentTemplate } from '@/lib/document-placeholders';
import { toast } from 'sonner';

export function useDocumentTemplates() {
  return useQuery({
    queryKey: ['document-templates'],
    queryFn: async (): Promise<DocumentTemplate[]> => {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('locale', 'de')
        .order('type');
      
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDocumentTemplate(type: string) {
  return useQuery({
    queryKey: ['document-template', type],
    queryFn: async (): Promise<DocumentTemplate | null> => {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('type', type)
        .eq('locale', 'de')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!type,
  });
}

export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Partial<DocumentTemplate> & { id: string }) => {
      const { id, ...updates } = template;
      const { data, error } = await supabase
        .from('document_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      queryClient.invalidateQueries({ queryKey: ['document-template'] });
      toast.success('Vorlage wurde gespeichert.');
    },
    onError: () => {
      toast.error('Beim Speichern der Vorlage ist ein Fehler aufgetreten.');
    },
  });
}
