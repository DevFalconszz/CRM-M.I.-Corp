import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Lead, LeadReport, STATUS_LABELS } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import {
  MapPin, Phone, Globe, MessageCircle, Instagram, ExternalLink, User, PhoneCall,
  FileText, Plus, Trash2, Pencil, Megaphone, Building2, StickyNote, CalendarDays,
} from 'lucide-react';
import { adLibraryUrl, adLibraryQueryTerm } from '@/lib/ad-library';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { loadLeadReports, addLeadReport, updateLeadReport, deleteLeadReport } from '@/lib/leads-store';
import { FirstContactComposer } from './FirstContact';
import { getLastContact } from '@/lib/first-contact';
import { toast } from 'sonner';
import { initials, avatarColor } from '@/lib/avatars';

interface Props {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      {children}
    </div>
  );
}

function FieldValue({ value = '', fallback = '—', monospace = false, href }: { value?: string; fallback?: string; monospace?: boolean; href?: string }) {
  const text = value || fallback;
  const cls = `text-sm text-foreground break-words ${monospace ? 'font-mono-num' : ''}`;
  if (href && value) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={`text-gold-500 hover:underline ${cls}`}>{value}</a>;
  }
  return <p className={cn(cls, !value && 'text-muted-foreground')}>{text}</p>;
}

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      <Icon className="w-4 h-4 text-gold-500" />
      {children}
    </p>
  );
}

export function LeadModal({ lead, open, onClose, onUpdate }: Props) {
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [descricao, setDescricao] = useState('');
  const [nomeDecisor, setNomeDecisor] = useState('');
  const [numeroDecisor, setNumeroDecisor] = useState('');
  const [reports, setReports] = useState<LeadReport[]>([]);
  const [newReport, setNewReport] = useState('');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (open && lead) {
      setWhatsapp(lead.whatsapp_group);
      setSelectedDates(lead.meeting_dates.map(d => new Date(d)));
      setDescricao(lead.descricao || '');
      setNomeDecisor(lead.nome_decisor || '');
      setNumeroDecisor(lead.numero_decisor || '');
      setNewReport('');
      setExpandedReport(null);
      setEditingReport(null);
      setShowContact(false);
      loadLeadReports(lead.id).then(setReports);
    }
  }, [open, lead]);

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  if (!lead) return null;

  const handleSave = () => {
    onUpdate({
      ...lead,
      whatsapp_group: whatsapp,
      meeting_dates: selectedDates.map(d => d.toISOString()),
      descricao,
      nome_decisor: nomeDecisor,
      numero_decisor: numeroDecisor,
    });
    onClose();
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDates(prev => {
      const exists = prev.some(d => d.toDateString() === date.toDateString());
      if (exists) return prev.filter(d => d.toDateString() !== date.toDateString());
      return [...prev, date];
    });
  };

  const generateGCalUrl = (date: Date) => {
    const start = date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(date.getTime() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Reunião - ${encodeURIComponent(lead.name)}&dates=${start}/${end}`;
  };

  const handleAddReport = async () => {
    if (!newReport.trim()) return;
    const created = await addLeadReport(lead.id, newReport.trim());
    if (created) {
      setReports(prev => [created, ...prev]);
      setNewReport('');
      toast.success('Relatório adicionado.');
    } else {
      toast.error('Erro ao adicionar relatório.');
    }
  };

  const handleUpdateReport = async (id: string, content: string) => {
    if (!content.trim()) return;
    const ok = await updateLeadReport(id, content.trim());
    if (ok) {
      setReports(prev => prev.map(r => r.id === id ? { ...r, content: content.trim() } : r));
      setEditingReport(null);
      toast.success('Relatório atualizado.');
    } else {
      toast.error('Erro ao atualizar relatório.');
    }
  };

  const handleDeleteReport = async (id: string) => {
    const ok = await deleteLeadReport(id);
    if (ok) {
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('Relatório removido.');
    } else {
      toast.error('Erro ao remover relatório.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar rounded-2xl p-4 sm:p-6">
        {/* Cabeçalho do lead */}
        <div className="flex items-center gap-3 sm:gap-4 pb-4 border-b border-border">
          <span className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full flex items-center justify-center text-base sm:text-lg font-bold ${avatarColor(lead.name)}`}>
            {initials(lead.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-xl font-semibold text-foreground">{lead.name}</DialogTitle>
              <StatusBadge status={lead.status} />
            </div>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
              {lead.category && <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{lead.category}</span>}
              {lead.responsavel && <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />{lead.responsavel}</span>}
              {lead.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>}
            </div>
          </div>
          <Button
            size="sm"
            className="h-9 rounded-xl text-xs font-semibold bg-gold-500 text-black hover:bg-gold-600 shrink-0"
            onClick={() => setShowContact((v) => !v)}
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            {showContact ? 'Fechar contato' : 'Primeiro contato'}
          </Button>
        </div>

        {showContact && (
          <div className="mt-3 sm:mt-4 rounded-xl border border-gold-500/30 bg-gold-500/[0.03] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <SectionTitle icon={MessageCircle}>Primeiro contato</SectionTitle>
              {getLastContact(lead.id) && (
                <span className="text-[11px] text-muted-foreground">
                  Último envio: {new Date(getLastContact(lead.id)!.at).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
            <FirstContactComposer lead={lead} inline />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          {/* Coluna esquerda */}
          <div className="space-y-4">
            <Card className="rounded-xl border-border/70">
              <CardContent className="p-4 space-y-3">
                <SectionTitle icon={Phone}>Contato</SectionTitle>
                <div className="grid grid-cols-1 gap-3 pt-1">
                  <Field label="Telefone"><FieldValue value={lead.phone} monospace /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cidade"><FieldValue value={lead.city} /></Field>
                    <Field label="Estado"><FieldValue value={lead.state} /></Field>
                  </div>
                  <Field label="Endereço"><FieldValue value={lead.address} /></Field>
                  {lead.website && <Field label="Website"><FieldValue value={lead.website} href={lead.website} /></Field>}
                  {lead.instagram && <Field label="Instagram"><FieldValue value={lead.instagram} /></Field>}
                  {(lead.google_maps_url || lead.website || lead.instagram) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {lead.google_maps_url && (
                        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                          <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 mr-1.5" />Google Maps</a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                        <a href={adLibraryUrl(adLibraryQueryTerm(lead.instagram, lead.name))} target="_blank" rel="noopener noreferrer"><Megaphone className="w-3 h-3 mr-1.5" />Ad Library</a>
                      </Button>
                    </div>
                  )}
                  {lead.has_ads != null && (
                    <div className="flex items-center gap-2 text-xs pt-1 border-t border-border/60">
                      <span className="text-muted-foreground">Anúncios:</span>
                      {lead.has_ads ? (
                        <span className="text-green-600 font-medium">{lead.google_ads_count ?? 0} anúncio(s)</span>
                      ) : (
                        <span className="text-muted-foreground">Sem anúncio</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/70">
              <CardContent className="p-4 space-y-3">
                <SectionTitle icon={User}>Decisor</SectionTitle>
                <div className="grid grid-cols-1 gap-3 pt-1">
                  <Field label="Nome">
                    <Input value={nomeDecisor} onChange={(e) => setNomeDecisor(e.target.value)} className="mt-1 bg-background border-input focus:border-gold-500 focus:ring-gold-500 text-sm" placeholder="Nome do decisor..." />
                  </Field>
                  <Field label="Número">
                    <Input value={numeroDecisor} onChange={(e) => setNumeroDecisor(e.target.value)} className="mt-1 bg-background border-input focus:border-gold-500 focus:ring-gold-500 text-sm font-mono-num" placeholder="(00) 00000-0000..." />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/70">
              <CardContent className="p-4 space-y-3">
                <SectionTitle icon={MessageCircle}>Grupo WhatsApp</SectionTitle>
                <Input placeholder="https://chat.whatsapp.com/..." value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="bg-background border-input focus:border-gold-500 focus:ring-gold-500" />
                {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-xs text-gold-500 hover:underline inline-block">Abrir grupo</a>}
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita */}
          <div className="space-y-4">
            <Card className="rounded-xl border-border/70">
              <CardContent className="p-4 space-y-3">
                <SectionTitle icon={StickyNote}>Informações Gerais</SectionTitle>
                <div className="grid grid-cols-1 gap-3 pt-1">
                  <Field label="Responsável"><FieldValue value={lead.responsavel} /></Field>
                  <Field label={STATUS_LABELS[lead.status]}>
                    <p className="text-sm text-foreground"><StatusBadge status={lead.status} /></p>
                  </Field>
                  <Field label="Descrição">
                    <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1 bg-background border-input focus:border-gold-500 focus:ring-gold-500 min-h-[90px] text-sm" placeholder="Descreva informações relevantes sobre este lead..." />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/70">
              <CardContent className="p-4 space-y-3">
                <SectionTitle icon={CalendarDays}>Agendar Reuniões</SectionTitle>
                <Calendar mode="single" selected={undefined} onSelect={handleDateSelect} modifiers={{ booked: selectedDates }} modifiersClassNames={{ booked: 'bg-gold-500 text-black rounded-md' }} numberOfMonths={1} className={cn("p-2 pointer-events-auto border border-border rounded-md w-full min-w-0")} />
                {selectedDates.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Reuniões agendadas:</p>
                    {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-accent rounded px-2 py-1.5 border border-border">
                        <span className="font-mono-num text-foreground">{d.toLocaleDateString('pt-BR')}</span>
                        <a href={generateGCalUrl(d)} target="_blank" rel="noopener noreferrer" className="text-gold-500 hover:underline">Google Calendar</a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Relatórios e anotações */}
        <Card className="mt-4 rounded-xl border-border/70">
          <CardContent className="p-4 space-y-3">
            <SectionTitle icon={FileText}>Relatórios e Anotações</SectionTitle>

            <div className="space-y-2">
              {reports.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Nenhum relatório/anotação registrado para este lead.</p>
              )}
              {reports.map(r => (
                <div key={r.id} className="border border-border rounded-xl bg-accent/40 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR')}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingReport(r.id); setEditingContent(r.content); }}>
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteReport(r.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {editingReport === r.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} className="min-h-[60px] text-sm bg-background border-input focus:border-gold-500" />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-gold-500 text-black hover:bg-gold-600" onClick={() => handleUpdateReport(r.id, editingContent)}>Salvar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingReport(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={"mt-1 text-foreground whitespace-pre-wrap cursor-pointer" + (expandedReport === r.id ? '' : ' line-clamp-2')} onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}>
                        {r.content}
                      </p>
                      {r.content.length > 120 && (
                        <button className="text-gold-500 text-xs hover:underline mt-1" onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}>
                          {expandedReport === r.id ? 'Ver menos' : 'Ver mais'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Textarea value={newReport} onChange={(e) => setNewReport(e.target.value)} placeholder="Escreva um novo relatório/anotação sobre este lead (ligações feitas, retornos, próximos passos...)" className="min-h-[70px] text-sm bg-background border-input focus:border-gold-500" />
              <Button className="bg-gold-500 text-black hover:bg-gold-600" onClick={handleAddReport} disabled={!newReport.trim()}>
                <Plus className="w-4 h-4 mr-1.5" /> Adicionar Relatório
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full mt-4 bg-gold-500 text-black hover:bg-gold-600">
          Salvar Alterações
        </Button>
      </DialogContent>
    </Dialog>
  );
}