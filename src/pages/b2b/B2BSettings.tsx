import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useB2BAuth } from '@/hooks/useB2BAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, Users, FileText, Save, Plus, Trash2, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { B2BRole, B2B_ROLE_LABELS, B2B_DOCUMENT_TYPE_LABELS, B2BDocumentTemplate, B2BUserInvitation } from '@/types/b2b';

export default function B2BSettings() {
  const { b2bPartner, b2bPartnerId, isB2BInhaber, canManageTemplates, refetchPartner } = useB2BAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('company');

  // Company info mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: Record<string, string | null>) => {
      const { error } = await supabase
        .from('b2b_partners')
        .update(data)
        .eq('id', b2bPartnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchPartner();
      toast.success('Firmendaten aktualisiert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  // Document templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['b2b-templates', b2bPartnerId],
    queryFn: async () => {
      if (!b2bPartnerId) return [];
      const { data, error } = await supabase
        .from('b2b_document_templates')
        .select('*')
        .eq('b2b_partner_id', b2bPartnerId);
      if (error) throw error;
      return data as B2BDocumentTemplate[];
    },
    enabled: !!b2bPartnerId,
  });

  // Users for B2B partner
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['b2b-users', b2bPartnerId],
    queryFn: async () => {
      if (!b2bPartnerId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, is_active, created_at')
        .eq('b2b_partner_id', b2bPartnerId);
      if (error) throw error;
      return data;
    },
    enabled: !!b2bPartnerId,
  });

  // Invitations
  const { data: invitations, isLoading: isLoadingInvitations } = useQuery({
    queryKey: ['b2b-invitations', b2bPartnerId],
    queryFn: async () => {
      if (!b2bPartnerId) return [];
      const { data, error } = await supabase
        .from('b2b_user_invitations')
        .select('*')
        .eq('b2b_partner_id', b2bPartnerId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());
      if (error) throw error;
      return data as B2BUserInvitation[];
    },
    enabled: !!b2bPartnerId && isB2BInhaber,
  });

  if (!b2bPartner) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground">Verwalten Sie Ihre Firmendaten und Einstellungen</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Firmendaten
          </TabsTrigger>
          {isB2BInhaber && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Benutzer
            </TabsTrigger>
          )}
          {canManageTemplates && (
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Dokumente
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <CompanySettingsCard 
            partner={b2bPartner} 
            onSave={(data) => updateCompanyMutation.mutate(data)}
            isSaving={updateCompanyMutation.isPending}
            canEdit={isB2BInhaber}
          />
        </TabsContent>

        {isB2BInhaber && (
          <TabsContent value="users" className="space-y-6">
            <UsersTab 
              users={users || []}
              invitations={invitations || []}
              isLoading={isLoadingUsers || isLoadingInvitations}
              b2bPartnerId={b2bPartnerId!}
            />
          </TabsContent>
        )}

        {canManageTemplates && (
          <TabsContent value="documents" className="space-y-6">
            <DocumentTemplatesTab
              templates={templates || []}
              isLoading={isLoadingTemplates}
              b2bPartnerId={b2bPartnerId!}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Company Settings Card Component
function CompanySettingsCard({ 
  partner, 
  onSave, 
  isSaving,
  canEdit 
}: { 
  partner: any; 
  onSave: (data: Record<string, string | null>) => void;
  isSaving: boolean;
  canEdit: boolean;
}) {
  const [formData, setFormData] = useState({
    company_slogan: partner.company_slogan || '',
    legal_footer: partner.legal_footer || '',
    terms_and_conditions: partner.terms_and_conditions || '',
    primary_color: partner.primary_color || '#000000',
    secondary_color: partner.secondary_color || '#666666',
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Firmendaten & Branding</CardTitle>
        <CardDescription>
          Diese Daten werden auf Ihren Dokumenten (Lieferschein, Reparaturbericht) angezeigt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Firmenname</Label>
              <p className="font-medium">{partner.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Kundennummer</Label>
              <p className="font-medium">{partner.customer_number || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Adresse</Label>
              <p className="font-medium">
                {partner.street}<br />
                {partner.zip} {partner.city}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Kontaktperson</Label>
              <p className="font-medium">{partner.contact_name || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">E-Mail</Label>
              <p className="font-medium">{partner.contact_email || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Telefon</Label>
              <p className="font-medium">{partner.contact_phone || '-'}</p>
            </div>
          </div>
        </div>

        {canEdit && (
          <>
            <hr />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slogan">Slogan / Untertitel</Label>
                <Input
                  id="slogan"
                  value={formData.company_slogan}
                  onChange={(e) => setFormData(f => ({ ...f, company_slogan: e.target.value }))}
                  placeholder="Ihr Firmenslogan für Dokumente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer">Rechtlicher Footer</Label>
                <Textarea
                  id="footer"
                  value={formData.legal_footer}
                  onChange={(e) => setFormData(f => ({ ...f, legal_footer: e.target.value }))}
                  placeholder="Text für die Fußzeile Ihrer Dokumente"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">AGB / Reparaturbedingungen</Label>
                <Textarea
                  id="terms"
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData(f => ({ ...f, terms_and_conditions: e.target.value }))}
                  placeholder="Ihre Allgemeinen Geschäftsbedingungen"
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primärfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="primaryColor"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(f => ({ ...f, primary_color: e.target.value }))}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData(f => ({ ...f, primary_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Sekundärfarbe</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="secondaryColor"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(f => ({ ...f, secondary_color: e.target.value }))}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData(f => ({ ...f, secondary_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Speichern
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Users Tab Component
function UsersTab({ 
  users, 
  invitations,
  isLoading,
  b2bPartnerId 
}: { 
  users: any[];
  invitations: B2BUserInvitation[];
  isLoading: boolean;
  b2bPartnerId: string;
}) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<B2BRole>('B2B_USER');
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from('b2b_user_invitations')
        .insert({
          b2b_partner_id: b2bPartnerId,
          email: inviteEmail,
          role: inviteRole,
          invitation_token: token,
        });
      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-invitations'] });
      toast.success('Einladung erstellt. Bitte teilen Sie den Einladungslink mit dem Benutzer.');
      setInviteDialogOpen(false);
      setInviteEmail('');
    },
    onError: () => toast.error('Fehler beim Erstellen der Einladung'),
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('b2b_user_invitations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-invitations'] });
      toast.success('Einladung gelöscht');
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Benutzer</CardTitle>
            <CardDescription>Verwalten Sie die Benutzer Ihres Unternehmens</CardDescription>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Benutzer einladen
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Keine Benutzer gefunden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Offene Einladungen</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Gültig bis</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{B2B_ROLE_LABELS[inv.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteInvitationMutation.mutate(inv.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer einladen</DialogTitle>
            <DialogDescription>
              Laden Sie einen neuen Benutzer in Ihr Unternehmen ein
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">E-Mail-Adresse</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="mitarbeiter@firma.de"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Rolle</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as B2BRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B2B_USER">Mitarbeiter</SelectItem>
                  <SelectItem value="B2B_ADMIN">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail || inviteMutation.isPending}>
              {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Mail className="h-4 w-4 mr-2" />
              Einladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Document Templates Tab Component
function DocumentTemplatesTab({ 
  templates, 
  isLoading,
  b2bPartnerId 
}: { 
  templates: B2BDocumentTemplate[];
  isLoading: boolean;
  b2bPartnerId: string;
}) {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<B2BDocumentTemplate | null>(null);
  const [templateType, setTemplateType] = useState<string>('LIEFERSCHEIN');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    intro: '',
    conditions: '',
    footer: '',
    legal_text: '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        const { error } = await supabase
          .from('b2b_document_templates')
          .update(formData)
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('b2b_document_templates')
          .insert({
            ...formData,
            b2b_partner_id: b2bPartnerId,
            template_type: templateType,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['b2b-templates'] });
      toast.success('Vorlage gespeichert');
      setDialogOpen(false);
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const handleEdit = (template: B2BDocumentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      intro: template.intro || '',
      conditions: template.conditions || '',
      footer: template.footer || '',
      legal_text: template.legal_text || '',
    });
    setDialogOpen(true);
  };

  const handleNew = (type: string) => {
    setEditingTemplate(null);
    setTemplateType(type);
    setFormData({
      title: B2B_DOCUMENT_TYPE_LABELS[type] || type,
      intro: '',
      conditions: '',
      footer: '',
      legal_text: '',
    });
    setDialogOpen(true);
  };

  const existingTypes = templates.map(t => t.template_type);
  const missingTypes = ['LIEFERSCHEIN', 'REPARATURBERICHT', 'KVA_SCHRIFTLICH'].filter(
    t => !existingTypes.includes(t as any)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dokumentvorlagen</CardTitle>
            <CardDescription>
              Passen Sie Ihre Dokumente mit Ihrem Branding an
            </CardDescription>
          </div>
          {missingTypes.length > 0 && (
            <Select onValueChange={handleNew}>
              <SelectTrigger className="w-[200px]">
                <Plus className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Vorlage erstellen" />
              </SelectTrigger>
              <SelectContent>
                {missingTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {B2B_DOCUMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Noch keine Dokumentvorlagen erstellt
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Typ</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {B2B_DOCUMENT_TYPE_LABELS[template.template_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{template.title}</TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                        Bearbeiten
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Einleitung</Label>
              <Textarea
                value={formData.intro}
                onChange={(e) => setFormData(f => ({ ...f, intro: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Bedingungen</Label>
              <Textarea
                value={formData.conditions}
                onChange={(e) => setFormData(f => ({ ...f, conditions: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Rechtlicher Text</Label>
              <Textarea
                value={formData.legal_text}
                onChange={(e) => setFormData(f => ({ ...f, legal_text: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Fußzeile</Label>
              <Textarea
                value={formData.footer}
                onChange={(e) => setFormData(f => ({ ...f, footer: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
