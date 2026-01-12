import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FileText,
  Search,
  Loader2,
  Filter,
  Eye,
  User,
  Clock,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'destructive' | 'success' | 'warning' }> = {
  APPROVE_PART_USAGE: { label: 'Teile freigegeben', variant: 'success' },
  REJECT_PART_USAGE: { label: 'Teile abgelehnt', variant: 'destructive' },
  CREATE_TICKET: { label: 'Auftrag erstellt', variant: 'default' },
  UPDATE_TICKET: { label: 'Auftrag geändert', variant: 'default' },
  DELETE_TICKET: { label: 'Auftrag gelöscht', variant: 'destructive' },
  CREATE_KVA: { label: 'KVA erstellt', variant: 'default' },
  UPDATE_KVA: { label: 'KVA geändert', variant: 'default' },
  APPROVE_KVA: { label: 'KVA genehmigt', variant: 'success' },
  REJECT_KVA: { label: 'KVA abgelehnt', variant: 'destructive' },
  USER_LOGIN: { label: 'Anmeldung', variant: 'default' },
  USER_LOGOUT: { label: 'Abmeldung', variant: 'default' },
  DATA_EXPORT: { label: 'Daten exportiert', variant: 'warning' },
  DATA_IMPORT: { label: 'Daten importiert', variant: 'warning' },
  SETTINGS_CHANGE: { label: 'Einstellungen geändert', variant: 'warning' },
};

const ENTITY_LABELS: Record<string, string> = {
  repair_tickets: 'Auftrag',
  ticket_part_usage: 'Teileverbrauch',
  kva_estimates: 'KVA',
  customers: 'Kunde',
  parts: 'Ersatzteil',
  profiles: 'Benutzer',
  b2b_partners: 'B2B-Partner',
  stock_movements: 'Lagerbewegung',
};

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  meta: Record<string, any> | null;
  created_at: string;
  user?: {
    name: string;
    email: string;
  } | null;
}

export default function AuditLogViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter, entityFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles(name, email)
        `)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      if (searchQuery) {
        query = query.or(`entity_id.ilike.%${searchQuery}%,action.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const { data: totalCount } = useQuery({
    queryKey: ['audit-logs-count', actionFilter, entityFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true });

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const totalPages = Math.ceil((totalCount || 0) / pageSize);

  const getActionBadge = (action: string) => {
    const config = ACTION_LABELS[action] || { label: action, variant: 'default' as const };
    const variantClass = {
      default: 'bg-muted text-muted-foreground',
      destructive: 'bg-destructive/10 text-destructive',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
    }[config.variant];

    return (
      <Badge variant="outline" className={variantClass}>
        {config.label}
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Audit-Log
              </CardTitle>
              <CardDescription>
                Protokoll aller sicherheitsrelevanten Aktionen
              </CardDescription>
            </div>
            <Badge variant="outline">
              {totalCount || 0} Einträge
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen nach ID oder Aktion..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={actionFilter}
              onValueChange={(v) => {
                setActionFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Aktion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Aktionen</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={entityFilter}
              onValueChange={(v) => {
                setEntityFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <FileText className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Entität" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Entitäten</SelectItem>
                {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Keine Einträge gefunden</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Zeitpunkt</TableHead>
                      <TableHead className="w-[150px]">Benutzer</TableHead>
                      <TableHead className="w-[180px]">Aktion</TableHead>
                      <TableHead>Entität</TableHead>
                      <TableHead className="w-[80px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(log.created_at), 'dd.MM.yy HH:mm:ss', { locale: de })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate max-w-[120px]">
                              {log.user?.name || 'System'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {ENTITY_LABELS[log.entity_type] || log.entity_type}
                            </span>
                            {log.entity_id && (
                              <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                                {log.entity_id}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Seite {page + 1} von {totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Zurück
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Weiter
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log-Details</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Benutzer</p>
                  <p className="font-medium">{selectedLog.user?.name || 'System'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aktion</p>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Entität</p>
                  <p className="font-medium">
                    {ENTITY_LABELS[selectedLog.entity_type] || selectedLog.entity_type}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono text-xs">{selectedLog.entity_id || '-'}</p>
                </div>
              </div>
              {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Metadaten</p>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedLog.meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
