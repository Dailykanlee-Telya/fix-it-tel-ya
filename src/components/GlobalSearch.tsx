import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, Ticket, User, Smartphone, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_LABELS, TicketStatus } from '@/types/database';

interface SearchResult {
  type: 'ticket' | 'customer' | 'device';
  id: string;
  title: string;
  subtitle: string;
  status?: string;
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search tickets
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['search-tickets', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('repair_tickets')
        .select(`
          id, ticket_number, status, error_description_text,
          customer:customers(first_name, last_name),
          device:devices(brand, model)
        `)
        .or(`ticket_number.ilike.%${debouncedQuery}%,error_description_text.ilike.%${debouncedQuery}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Search customers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['search-customers', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email')
        .or(`first_name.ilike.%${debouncedQuery}%,last_name.ilike.%${debouncedQuery}%,phone.ilike.%${debouncedQuery}%,email.ilike.%${debouncedQuery}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Search devices
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['search-devices', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('devices')
        .select('id, brand, model, imei_or_serial, customer:customers(first_name, last_name)')
        .or(`brand.ilike.%${debouncedQuery}%,model.ilike.%${debouncedQuery}%,imei_or_serial.ilike.%${debouncedQuery}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: debouncedQuery.length >= 2,
  });

  const isLoading = ticketsLoading || customersLoading || devicesLoading;

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    switch (result.type) {
      case 'ticket':
        navigate(`/tickets/${result.id}`);
        break;
      case 'customer':
        navigate(`/customers?search=${result.id}`);
        break;
      case 'device':
        navigate(`/tickets?device=${result.id}`);
        break;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      NEU_EINGEGANGEN: 'bg-primary/10 text-primary',
      IN_DIAGNOSE: 'bg-purple-500/10 text-purple-600',
      WARTET_AUF_TEIL_ODER_FREIGABE: 'bg-warning/10 text-warning',
      IN_REPARATUR: 'bg-info/10 text-info',
      FERTIG_ZUR_ABHOLUNG: 'bg-success/10 text-success',
      ABGEHOLT: 'bg-muted text-muted-foreground',
      STORNIERT: 'bg-destructive/10 text-destructive',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const hasResults = (tickets?.length || 0) + (customers?.length || 0) + (devices?.length || 0) > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Suchen... (Ticket, Kunde, IMEI)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-8 bg-muted/50 border-0 focus-visible:ring-1"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Suche...
            </div>
          )}

          {!isLoading && !hasResults && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Keine Ergebnisse für "{debouncedQuery}"
            </div>
          )}

          {/* Tickets */}
          {tickets && tickets.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Reparaturaufträge
              </div>
              {tickets.map((ticket: any) => (
                <button
                  key={ticket.id}
                  onClick={() => handleSelect({ type: 'ticket', id: ticket.id, title: ticket.ticket_number, subtitle: '' })}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 text-left transition-colors"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Ticket className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ticket.ticket_number}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ticket.customer?.first_name} {ticket.customer?.last_name} • {ticket.device?.brand} {ticket.device?.model}
                    </p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(ticket.status))}>
                    {STATUS_LABELS[ticket.status as TicketStatus] || ticket.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Customers */}
          {customers && customers.length > 0 && (
            <div className="p-2 border-t border-border">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Kunden
              </div>
              {customers.map((customer: any) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelect({ type: 'customer', id: customer.id, title: `${customer.first_name} ${customer.last_name}`, subtitle: customer.phone })}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 text-left transition-colors"
                >
                  <div className="h-8 w-8 rounded-md bg-success/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{customer.first_name} {customer.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {customer.phone} {customer.email && `• ${customer.email}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Devices */}
          {devices && devices.length > 0 && (
            <div className="p-2 border-t border-border">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Geräte
              </div>
              {devices.map((device: any) => (
                <button
                  key={device.id}
                  onClick={() => handleSelect({ type: 'device', id: device.id, title: `${device.brand} ${device.model}`, subtitle: device.imei_or_serial || '' })}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 text-left transition-colors"
                >
                  <div className="h-8 w-8 rounded-md bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{device.brand} {device.model}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {device.imei_or_serial || 'Keine IMEI'} • {device.customer?.first_name} {device.customer?.last_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
