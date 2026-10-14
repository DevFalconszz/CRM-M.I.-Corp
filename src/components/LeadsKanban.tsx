import { Lead, STATUS_LABELS, LeadStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Pencil, MapPin, Phone, User, Building2, ClipboardList } from 'lucide-react';
import { initials, avatarColor } from '@/lib/avatars';
import { cn } from '@/lib/utils';

interface Props {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
}

const COLUMNS: { key: LeadStatus; title: string; className: string }[] = [
  { key: 'analise_pendente', title: STATUS_LABELS['analise_pendente'], className: 'border-amber-500/40 bg-amber-500/[0.02]' },
  { key: 'em_analise', title: STATUS_LABELS['em_analise'], className: 'border-orange-500/40 bg-orange-500/[0.02]' },
  { key: 'ponto_contato', title: STATUS_LABELS['ponto_contato'], className: 'border-pink-500/40 bg-pink-500/[0.02]' },
  { key: 'follow_up', title: STATUS_LABELS['follow_up'], className: 'border-sky-500/40 bg-sky-500/[0.02]' },
  { key: 'reuniao_agendada', title: STATUS_LABELS['reuniao_agendada'], className: 'border-violet-500/40 bg-violet-500/[0.02]' },
  { key: 'venda_fechada', title: STATUS_LABELS['venda_fechada'], className: 'border-emerald-500/40 bg-emerald-500/[0.02]' },
  { key: 'recusado', title: STATUS_LABELS['recusado'], className: 'border-red-500/40 bg-red-500/[0.02]' },
];

export function LeadsKanban({ leads, onOpenLead, onUpdateLead }: Props) {
  const grouped = leads.reduce<Record<string, Lead[]>>((acc, lead) => {
    const key = lead.status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(lead);
    return acc;
  }, {});

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.status !== status) {
      onUpdateLead({ ...lead, status });
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto custom-scrollbar overscroll-x-contain snap-x snap-mandatory scroll-px-3 sm:scroll-px-0 pb-3 -mx-3 sm:mx-0 px-3 sm:px-0 custom-scrollbar touch-pan-x">
      {COLUMNS.map((col) => {
        const list = grouped[col.key] || [];
        return (
          <div
            key={col.key}
            className={cn(
              'flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[340px] xl:w-[320px] rounded-xl border bg-card/80 shadow-sm flex flex-col max-h-[calc(100vh-260px)] snap-start scroll-smooth',
              col.className
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div className="p-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusBadge status={col.key} />
                <span className="text-xs font-medium text-muted-foreground">{col.title}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">{list.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 custom-scrollbar">
              {list.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  className="rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor(lead.name)}`}>
                        {initials(lead.name)}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate">{lead.name}</h4>
                        {lead.category && (
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" /> {lead.category}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {lead.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {lead.city}
                        {lead.state ? `, ${lead.state}` : ''}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1 font-mono-num">
                        <Phone className="w-3 h-3" /> {lead.phone}
                      </span>
                    )}
                  </div>

                  {(lead.nome_decisor || lead.responsavel) && (
                    <div className="mt-1.5 text-[11px] space-y-0.5">
                      {lead.nome_decisor && (
                        <p className="flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Decisor:</span>
                          <span className="font-medium text-foreground truncate">{lead.nome_decisor}</span>
                        </p>
                      )}
                      {lead.responsavel && (
                        <p className="flex items-center gap-1">
                          <ClipboardList className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Resp.:</span>
                          <span className="font-medium text-foreground truncate">{lead.responsavel}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs border-input hover:border-gold-500"
                      onClick={() => onOpenLead(lead)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                  </div>
                </div>
              ))}
              {list.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-xs">Sem leads nesta etapa</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
