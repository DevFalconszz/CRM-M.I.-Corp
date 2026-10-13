import { useState, useMemo } from 'react';
import { Lead, AdminUser } from '@/lib/types';
import { StatusSelect } from './StatusSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Eye, MapPin, Phone, User2, PackageOpen, Trash2, ArrowRightLeft, CheckSquare, X,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { initials, avatarColor } from '@/lib/avatars';

interface Props {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
  role?: string | null;
  users?: AdminUser[];
  onDeleteLead?: (id: string) => void;
  onDeleteLeads?: (ids: string[]) => void;
  onTransferLead?: (leadId: string, targetUserId: string, targetUserName: string) => void;
  onTransferLeads?: (ids: string[], targetUserId: string, targetUserName: string) => void;
}

const statusRowBg: Record<string, string> = {
  analise_pendente: 'bg-amber-500/[0.03]',
  em_analise: 'bg-orange-500/[0.03]',
  ponto_contato: 'bg-pink-500/[0.03]',
  follow_up: 'bg-sky-500/[0.03]',
  reuniao_agendada: 'bg-violet-500/[0.03]',
  recusado: 'bg-red-500/[0.04]',
  venda_fechada: 'bg-emerald-500/[0.03]',
};

function EditableCell({ value, onChange, className = '' }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <Input
      className={`h-8 text-xs border-transparent bg-transparent hover:border-border focus:border-gold-500 focus:bg-card transition-colors ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function IconCell({ icon, value, onChange, className = '' }: { icon: React.ReactNode; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground/50 shrink-0">{icon}</span>
      <EditableCell value={value} onChange={onChange} className={className} />
    </div>
  );
}

export function LeadsTable({
  leads, onOpenLead, onUpdateLead, role, users = [],
  onDeleteLead, onDeleteLeads, onTransferLead, onTransferLeads,
}: Props) {
  const isAdmin = role === 'admin';
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Lead | null>(null);
  const [transferUserId, setTransferUserId] = useState('');
  const [bulkTransferUserId, setBulkTransferUserId] = useState('');

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  const selectedCount = selectedIds.size;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Exclusão individual
  const handleDelete = () => {
    if (deleteTarget && onDeleteLead) {
      onDeleteLead(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  // Transferência individual
  const handleTransfer = () => {
    if (transferTarget && transferUserId && onTransferLead) {
      const target = users.find((u) => u.id === transferUserId);
      if (target) {
        onTransferLead(transferTarget.id, target.id, target.name || target.email);
        setTransferTarget(null);
        setTransferUserId('');
      }
    }
  };

  // Exclusão em lote
  const handleBulkDelete = () => {
    if (onDeleteLeads) {
      onDeleteLeads(Array.from(selectedIds));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    }
  };

  // Transferência em lote
  const handleBulkTransfer = () => {
    if (bulkTransferUserId && onTransferLeads) {
      const target = users.find((u) => u.id === bulkTransferUserId);
      if (target) {
        onTransferLeads(Array.from(selectedIds), target.id, target.name || target.email);
        setSelectedIds(new Set());
        setBulkTransferUserId('');
      }
    }
  };

  const activeUsers = useMemo(() => users.filter((u) => !u.deleted_at), [users]);

  return (
    <>
      {/* Barra de ações em lote */}
      {isAdmin && selectedCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-gold-500/30 bg-gold-500/5 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-gold-500" />
            {selectedCount} lead{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              className="bg-card border border-border rounded-lg text-xs px-3 py-1.5 max-w-[180px]"
              value={bulkTransferUserId}
              onChange={(e) => setBulkTransferUserId(e.target.value)}
            >
              <option value="">Transferir para...</option>
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
            <Button
              size="sm"
              className="h-8 bg-gold-500 text-black hover:bg-gold-600"
              disabled={!bulkTransferUserId}
              onClick={handleBulkTransfer}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
              Transferir
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-red-500 border-red-500/30 hover:bg-red-500/10"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Excluir
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={clearSelection}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="border border-border/70 rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-accent/60">
                {isAdmin && (
                  <th className="sticky left-0 z-10 bg-accent/70 backdrop-blur px-4 py-3 font-semibold w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border accent-gold-500 cursor-pointer"
                      title="Selecionar todos"
                    />
                  </th>
                )}
                <th className="sticky left-0 z-10 bg-accent/70 backdrop-blur px-4 py-3 font-semibold whitespace-nowrap">Nome</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Nicho</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Cidade</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Telefone</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Nome Decisor</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Número Decisor</th>
                <th className="px-3 py-3 font-semibold whitespace-nowrap">Responsável</th>
                <th className="sticky right-0 z-10 bg-accent/70 backdrop-blur px-4 py-3 text-center font-semibold whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => {
                const isSelected = selectedIds.has(lead.id);
                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-accent/40 transition-colors ${statusRowBg[lead.status] || ''} ${i % 2 === 1 ? 'bg-accent/20' : ''} ${isSelected ? 'bg-gold-500/[0.08]' : ''}`}
                  >
                    {isAdmin && (
                      <td className="sticky left-0 z-10 bg-card px-4 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(lead.id)}
                          className="h-4 w-4 rounded border-border accent-gold-500 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className={`sticky z-10 bg-card px-4 py-2 font-medium whitespace-nowrap ${isAdmin ? 'left-[44px]' : 'left-0'}`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor(lead.name)}`}>
                          {initials(lead.name)}
                        </span>
                        <EditableCell value={lead.name} onChange={(v) => onUpdateLead({ ...lead, name: v })} className="font-medium w-[180px]" />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusSelect value={lead.status} onChange={(s) => onUpdateLead({ ...lead, status: s })} />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell value={lead.category} onChange={(v) => onUpdateLead({ ...lead, category: v })} className="w-[120px]" />
                    </td>
                    <td className="px-3 py-2">
                      <IconCell icon={<MapPin className="w-3.5 h-3.5" />} value={lead.city} onChange={(v) => onUpdateLead({ ...lead, city: v })} className="w-[110px]" />
                    </td>
                    <td className="px-3 py-2">
                      <IconCell icon={<Phone className="w-3.5 h-3.5" />} value={lead.phone} onChange={(v) => onUpdateLead({ ...lead, phone: v })} className="w-[130px] font-mono-num" />
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-foreground">{lead.nome_decisor || '—'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-mono-num text-foreground">{lead.numero_decisor || '—'}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-xs text-foreground">
                        <User2 className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        {lead.responsavel || '—'}
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-card px-4 py-2 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-accent" onClick={() => onOpenLead(lead)} title="Ver detalhes">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-accent" onClick={() => { setTransferTarget(lead); setTransferUserId(lead.user_id || ''); }} title="Transferir">
                              <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10" onClick={() => setDeleteTarget(lead)} title="Excluir">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {leads.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium text-foreground">Nenhum lead encontrado</p>
            <p className="text-sm mt-1">Adicione novos leads pela tela de Prospecção.</p>
          </div>
        )}
      </div>

      {/* Exclusão individual */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exclusão em lote */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir leads selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedCount} lead{selectedCount !== 1 ? 's' : ''}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600">
              Excluir todos ({selectedCount})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transferência individual */}
      <Dialog open={!!transferTarget} onOpenChange={(o) => { if (!o) { setTransferTarget(null); setTransferUserId(''); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Transferir Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Transferir <strong>{transferTarget?.name}</strong> para:
            </p>
            <select className="w-full bg-accent border border-border rounded-xl px-3 py-2 text-sm" value={transferUserId} onChange={(e) => setTransferUserId(e.target.value)}>
              <option value="">Selecione um usuário</option>
              {activeUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email} {u.id === transferTarget?.user_id ? '(atual)' : ''}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTransferTarget(null); setTransferUserId(''); }}>Cancelar</Button>
            <Button className="bg-gold-500 text-black hover:bg-gold-600" onClick={handleTransfer} disabled={!transferUserId || transferUserId === transferTarget?.user_id}>Transferir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
