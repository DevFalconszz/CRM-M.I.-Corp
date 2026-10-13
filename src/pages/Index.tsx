import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lead, AdminUser } from '@/lib/types';
import { loadLeads, insertLead, updateLead, deleteLead, transferLead } from '@/lib/leads-store';
import { LeadsTable } from '@/components/LeadsTable';
import { LeadCard } from '@/components/LeadCard';
import { LeadModal } from '@/components/LeadModal';
import { AddLeadModal } from '@/components/AddLeadModal';
import { Plus, Search, LayoutGrid, Table2, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAdminUsers } from '@/lib/dashboard-api';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Index = () => {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const isMobile = useIsMobile();
  const leadsRef = useRef<Lead[]>([]);
  leadsRef.current = leads;

  useEffect(() => { if (isMobile) setViewMode('cards'); }, [isMobile]);

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
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.name.toLowerCase().includes(q) || l.category.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) || l.responsavel.toLowerCase().includes(q) ||
      l.nome_decisor.toLowerCase().includes(q)
    );
  }, [leads, search]);

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
                <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" className={`h-10 sm:h-11 w-10 sm:w-11 p-0 rounded-xl ${viewMode === 'table' ? 'bg-gold-500 hover:bg-gold-600 text-black' : ''}`} onClick={() => setViewMode('table')}><Table2 className="w-4 h-4" /></Button>
              </div>
              <Button className="h-10 sm:h-11 rounded-xl px-3 sm:px-4 text-sm bg-gold-500 text-black hover:bg-gold-600" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Adicionar</span><span className="sm:hidden">Novo</span>
              </Button>
              <span className="text-xs font-medium text-muted-foreground bg-accent px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">{filtered.length} leads</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /></div>
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
            />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(lead => (
              <LeadCard key={lead.id} lead={lead} onOpenLead={setSelectedLead} onUpdateLead={handleUpdateLead} />
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
    </div>
  );
};

export default Index;
