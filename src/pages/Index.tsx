import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lead, AdminUser } from '@/lib/types';
import { loadLeads, insertLead, updateLead, deleteLead, transferLead } from '@/lib/leads-store';
import { LeadsTable } from '@/components/LeadsTable';
import { LeadCard } from '@/components/LeadCard';
import { LeadsKanban } from '@/components/LeadsKanban';
import { LeadModal } from '@/components/LeadModal';
import { AddLeadModal } from '@/components/AddLeadModal';
import { FirstContactModal } from '@/components/FirstContact';
import { Plus, Search, LayoutGrid, Table2, Columns, Filter, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminUsers } from '@/lib/dashboard-api';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

const Index = () => {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin';
  const [filters, setFilters] = useState({
    status: [] as string[],
    responsavel: '',
    city: '',
    state: '',
  });
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'kanban'>('table');
  const [contactLead, setContactLead] = useState<Lead | null>(null);
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const leadsRef = useRef<Lead[]>([]);
  leadsRef.current = leads;

  useEffect(() => { if (isMobile && viewMode === 'kanban') setViewMode('cards'); }, [isMobile]);

  // Restaurar preferências
  useEffect(() => {
    try {
      const savedView = localStorage.getItem('crm_viewMode') as any;
      if (savedView && ['table','cards','kanban'].includes(savedView)) {
        setViewMode(savedView);
      }
      const savedFilters = localStorage.getItem('crm_filters');
      if (savedFilters) {
        setFilters(JSON.parse(savedFilters));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('crm_viewMode', viewMode); } catch (e) {}
  }, [viewMode]);

  useEffect(() => {
    try { localStorage.setItem('crm_filters', JSON.stringify(filters)); } catch (e) {}
  }, [filters]);

  // Carga inicial + usuários admin
  useEffect(() => {
    loadLeads().then(data => { setLeads(data); setLoading(false); });
    if (isAdmin) fetchAdminUsers().then(setUsers).catch(() => {});
  }, [isAdmin]);

  // Realtime + polling de segurança
  useEffect(() => {
    const myUserId = user?.id;
    if (!myUserId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const reloadLeads = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadLeads().then(data => {
          setLeads(data);
        });
      }, 200);
    };

    // Polling a cada 10s como garantia de atualização
    const pollInterval = setInterval(() => {
      loadLeads().then(data => {
        setLeads(data);
      });
    }, 10000);

    // Realtime (melhor esforço)
    const channelName = `leads-rt-${myUserId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => { reloadLeads(); }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [isAdmin, user?.id]);

  const handleUpdateLead = useCallback(async (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    await updateLead(updated);
  }, []);

  const handleAddLead = async (lead: Lead) => {
    const { id, ...rest } = lead;
    const inserted = await insertLead(rest);
    if (inserted) {
      setLeads(prev => [inserted, ...prev]);
      toast.success('Lead adicionado!');
    } else {
      toast.error('Erro ao adicionar lead.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    const ok = await deleteLead(id);
    if (ok) {
      setLeads(prev => prev.filter(l => l.id !== id));
      toast.success('Lead excluído.');
    } else {
      toast.error('Erro ao excluir lead.');
    }
  };

  const handleTransferLead = async (leadId: string, targetUserId: string, targetUserName: string) => {
    const ok = await transferLead(leadId, targetUserId, targetUserName);
    if (ok) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, user_id: targetUserId, responsavel: targetUserName } : l));
      toast.success(`Lead transferido para ${targetUserName}.`);
    } else {
      toast.error('Erro ao transferir lead.');
    }
  };

  const handleDeleteLeads = async (ids: string[]) => {
    const ok = await Promise.all(ids.map(id => deleteLead(id)));
    const successCount = ok.filter(Boolean).length;
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
    toast.success(`${successCount} lead${successCount !== 1 ? 's' : ''} excluído${successCount !== 1 ? 's' : ''}.`);
  };

  const handleTransferLeads = async (ids: string[], targetUserId: string, targetUserName: string) => {
    const ok = await Promise.all(ids.map(id => transferLead(id, targetUserId, targetUserName)));
    const successCount = ok.filter(Boolean).length;
    setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, user_id: targetUserId, responsavel: targetUserName } : l));
    toast.success(`${successCount} lead${successCount !== 1 ? 's' : ''} transferido${successCount !== 1 ? 's' : ''} para ${targetUserName}.`);
  };

  const filtered = useMemo(() => {
    let result = leads;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) || l.responsavel.toLowerCase().includes(q) ||
        l.nome_decisor.toLowerCase().includes(q)
      );
    }
    if (filters.status.length > 0) {
      result = result.filter(l => filters.status.includes(l.status));
    }
    if (filters.responsavel) {
      result = result.filter(l => (l.responsavel || '').toLowerCase().includes(filters.responsavel.toLowerCase()));
    }
    if (filters.city) {
      result = result.filter(l => (l.city || '').toLowerCase().includes(filters.city.toLowerCase()));
    }
    if (filters.state) {
      result = result.filter(l => (l.state || '').toUpperCase().includes(filters.state.toUpperCase()));
    }
    return result;
  }, [leads, search, filters]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex flex-col md:flex-row md:items-center gap-2 sm:gap-3">
            <div className="relative flex-1 md:min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-10 h-11 text-sm rounded-xl bg-background border-input focus:border-gold-500 focus:ring-gold-500 w-full" placeholder="Buscar por nome, cidade, decisor, responsável..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 shrink-0 md:justify-end">
              <div className="flex gap-1.5 sm:gap-2">
                <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" className={`h-10 sm:h-11 w-10 sm:w-11 p-0 rounded-xl ${viewMode === 'cards' ? 'bg-gold-500 hover:bg-gold-600 text-black' : ''}`} onClick={() => setViewMode('cards')}><LayoutGrid className="w-4 h-4" /></Button>
                <Button variant={viewMode === 'kanban' ? 'default' : 'outline'} size="sm" className={`h-10 sm:h-11 w-10 sm:w-11 p-0 rounded-xl ${viewMode === 'kanban' ? 'bg-gold-500 hover:bg-gold-600 text-black' : ''}`} onClick={() => setViewMode('kanban')}><Columns className="w-4 h-4" /></Button>
                <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" className={`h-10 sm:h-11 w-10 sm:w-11 p-0 rounded-xl ${viewMode === 'table' ? 'bg-gold-500 hover:bg-gold-600 text-black' : ''}`} onClick={() => setViewMode('table')}><Table2 className="w-4 h-4" /></Button>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 sm:h-11 rounded-xl px-3 sm:px-4 text-sm">
                    <Filter className="w-4 h-4 mr-1 sm:mr-2" /> Filtros
                    {(filters.status.length>0 || filters.responsavel || filters.city || filters.state) && <Badge className="ml-2 bg-gold-500 text-black">{(filters.status.length>0?1:0) + (filters.responsavel?1:0)+(filters.city?1:0)+(filters.state?1:0)}</Badge>}
                  </Button>
                </SheetTrigger>
                <SheetContent side={isMobile ? 'bottom' : 'right'} className={isMobile ? 'h-[85vh] p-0' : 'w-[340px] p-0'}>
                  <SheetHeader className="px-5 py-4 border-b border-border">
                    <SheetTitle>Filtros rápidos</SheetTitle>
                  </SheetHeader>
                  <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
                      <div className="flex flex-wrap gap-2">
                        {(['analise_pendente','em_analise','ponto_contato','follow_up','reuniao_agendada','venda_fechada','recusado'] as any[]).map((s) => (
                          <button key={s} onClick={() => setFilters(f => ({...f, status: f.status.includes(s) ? f.status.filter(x=>x!==s) : [...f.status, s]}))} className={`px-2 py-1 rounded-full text-xs border ${filters.status.includes(s) ? 'bg-gold-500 text-black border-gold-500' : 'bg-accent border-border text-foreground'}`}>{s.replace('_',' ').toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                    {isAdmin && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Responsável</p>
                        <Input value={filters.responsavel} onChange={(e)=>setFilters(f=>({...f,responsavel:e.target.value}))} placeholder="Nome do responsável" className="h-9 text-sm" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Cidade</p>
                        <Input value={filters.city} onChange={(e)=>setFilters(f=>({...f,city:e.target.value}))} placeholder="Cidade" className="h-9 text-sm" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">UF</p>
                        <Input value={filters.state} onChange={(e)=>setFilters(f=>({...f,state:e.target.value.toUpperCase()}))} placeholder="UF" className="h-9 text-sm uppercase" />
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={()=>setFilters({status:[],responsavel:'',city:'',state:''})}>Limpar filtros</Button>
                  </div>
                </SheetContent>
              </Sheet>
              <span className="text-xs font-medium text-muted-foreground bg-accent px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">{filtered.length} leads</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /></div>
        ) : viewMode === 'kanban' ? (
          <LeadsKanban leads={filtered} onOpenLead={setSelectedLead} onUpdateLead={handleUpdateLead} onFirstContact={setContactLead} />
        ) : viewMode === 'table' ? (
          <LeadsTable
              leads={filtered}
              onOpenLead={setSelectedLead}
              onUpdateLead={handleUpdateLead}
              role={role}
              users={users}
              onDeleteLead={handleDeleteLead}
              onDeleteLeads={handleDeleteLeads}
              onTransferLead={handleTransferLead}
              onTransferLeads={handleTransferLeads}
              onFirstContact={setContactLead}
            />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(lead => (
              <LeadCard key={lead.id} lead={lead} onOpenLead={setSelectedLead} onUpdateLead={handleUpdateLead} onFirstContact={setContactLead} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <p className="text-lg font-medium text-foreground">Nenhum lead encontrado</p>
                <p className="text-sm mt-1">Adicione novos leads pela tela de Prospecção.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <LeadModal lead={selectedLead} open={!!selectedLead} onClose={() => setSelectedLead(null)} onUpdate={handleUpdateLead} />
      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAddLead} />
      <FirstContactModal lead={contactLead} onClose={() => setContactLead(null)} />
    </div>
  );
};

export default Index;
