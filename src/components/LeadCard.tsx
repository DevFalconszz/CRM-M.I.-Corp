import { Lead } from '@/lib/types';
import { StatusSelect } from './StatusSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, MapPin, Phone, Pencil, Check, X, User, Building2, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { initials, avatarColor } from '@/lib/avatars';

interface Props {
  lead: Lead;
  onOpenLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
}

const statusCardBorder: Record<string, string> = {
  analise_pendente: 'border-l-4 border-l-amber-500',
  em_analise: 'border-l-4 border-l-orange-500',
  ponto_contato: 'border-l-4 border-l-pink-500',
  follow_up: 'border-l-4 border-l-sky-500',
  reuniao_agendada: 'border-l-4 border-l-violet-500',
  recusado: 'border-l-4 border-l-red-500',
  venda_fechada: 'border-l-4 border-l-emerald-500',
};

export function LeadCard({ lead, onOpenLead, onUpdateLead }: Props) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(lead);

  const startEdit = () => { setEditData(lead); setEditing(true); };
  const saveEdit = () => { onUpdateLead(editData); setEditing(false); };
  const cancelEdit = () => setEditing(false);

  const borderClass = statusCardBorder[lead.status] || 'border-l-4 border-l-transparent';

  if (editing) {
    return (
      <div className={`rounded-xl bg-card p-4 shadow-sm border border-border ${borderClass} space-y-3`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Editando</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-9 w-9 p-0"><X className="w-4 h-4" /></Button>
            <Button size="sm" onClick={saveEdit} className="h-9 px-4 bg-gold-500 text-black hover:bg-gold-600"><Check className="w-4 h-4 mr-1" /> Salvar</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {([
            ['name', 'Nome'], ['category', 'Nicho'], ['city', 'Cidade'], ['state', 'UF'],
            ['phone', 'Telefone'],
            ['descricao', 'Descrição'], ['website', 'Website'],
          ] as [keyof Lead, string][]).map(([key, label]) => (
            <div key={key} className={key === 'descricao' || key === 'website' ? 'sm:col-span-2' : ''}>
              <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
              <Input className="h-10 text-sm mt-0.5 bg-background border-input focus:border-gold-500" value={(editData[key] as string) || ''} onChange={(e) => setEditData(prev => ({ ...prev, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-card p-4 shadow-sm border border-border hover:shadow-md transition-shadow ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor(lead.name)}`}>
            {initials(lead.name)}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate text-base">{lead.name}</h3>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              {lead.category && <><Building2 className="w-3 h-3" /> {lead.category}</>}
            </p>
          </div>
        </div>
        <StatusSelect value={lead.status} onChange={(s) => onUpdateLead({ ...lead, status: s })} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {lead.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.city}{lead.state ? `, ${lead.state}` : ''}</span>}
        {lead.phone && <span className="flex items-center gap-1 font-mono-num"><Phone className="w-3 h-3" /> {lead.phone}</span>}
      </div>

      {(lead.nome_decisor || lead.responsavel) && (
        <div className="mt-2 text-xs space-y-0.5">
          {lead.nome_decisor && <p className="flex items-center gap-1"><User className="w-3 h-3 text-muted-foreground" /><span className="text-muted-foreground">Decisor:</span> <span className="font-medium text-foreground">{lead.nome_decisor}</span></p>}
          {lead.responsavel && <p className="flex items-center gap-1"><ClipboardList className="w-3 h-3 text-muted-foreground" /><span className="text-muted-foreground">Responsável:</span> <span className="font-medium text-foreground">{lead.responsavel}</span></p>}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-10 text-sm border-input hover:border-gold-500" onClick={startEdit}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Button>
        <Button size="sm" className="flex-1 h-10 text-sm bg-gold-500 text-black hover:bg-gold-600" onClick={() => onOpenLead(lead)}><Eye className="w-4 h-4 mr-1.5" /> Detalhes</Button>
      </div>
    </div>
  );
}