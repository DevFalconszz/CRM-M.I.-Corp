import { Lead } from '@/lib/types';
import { StatusSelect } from './StatusSelect';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Pencil, User, Building2, ClipboardList, MessageCircle } from 'lucide-react';
import { initials, avatarColor } from '@/lib/avatars';

interface Props {
  lead: Lead;
  onOpenLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
  onFirstContact?: (lead: Lead) => void;
}

const statusCardBorder: Record<string, string> = {
  analise_pendente: 'border-l-4 border-l-amber-500',
  em_analise: 'border-l-4 border-l-orange-500',
  ponto_contato: 'border-l-4 border-l-pink-500',
  mensagem_enviada: 'border-l-4 border-l-teal-500',
  follow_up: 'border-l-4 border-l-sky-500',
  reuniao_agendada: 'border-l-4 border-l-violet-500',
  recusado: 'border-l-4 border-l-red-500',
  venda_fechada: 'border-l-4 border-l-emerald-500',
};

export function LeadCard({ lead, onOpenLead, onUpdateLead, onFirstContact }: Props) {
  const borderClass = statusCardBorder[lead.status] || 'border-l-4 border-l-transparent';

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
        <Button size="sm" className="flex-1 h-10 text-sm bg-gold-500 text-black hover:bg-gold-600" onClick={() => onOpenLead(lead)}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Button>
        {onFirstContact && (
          <Button
            size="sm"
            variant="outline"
            className="h-10 w-10 p-0 border-input hover:border-gold-500"
            onClick={() => onFirstContact(lead)}
            title="Primeiro contato no WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
