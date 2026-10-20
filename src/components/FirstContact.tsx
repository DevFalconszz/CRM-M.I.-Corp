import { useEffect, useState } from 'react';
import { Lead } from '@/lib/types';
import { Portal } from './Portal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { addLeadReport } from '@/lib/leads-store';
import { CONTACT_REPORT_PREFIX } from '@/lib/contact-stats';
import { toast } from 'sonner';
import {
  MessageCircle, Copy, ExternalLink, ShieldCheck, X, MapPin, Phone,
  AlertTriangle, CheckCircle2, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials, avatarColor } from '@/lib/avatars';
import {
  buildFirstContactMessage, getLeadContactNumber, getSendStats, isValidWhatsAppNumber,
  recordContact, whatsappLink, SAFE_LIMITS, type SendStats,
} from '@/lib/first-contact';

interface ComposerProps {
  lead: Lead;
  onSent?: (lead: Lead) => void;
  onClose?: () => void;
  /** Usado dentro do LeadModal, sem moldura própria. */
  inline?: boolean;
}

export function FirstContactComposer({ lead, onSent, onClose, inline = false }: ComposerProps) {
  const { user } = useAuth();
  const senderName = (user?.user_metadata?.full_name as string) || user?.email || '';

  const contactNumber = getLeadContactNumber(lead);
  const phoneOk = isValidWhatsAppNumber(contactNumber);
  const [message, setMessage] = useState(() => buildFirstContactMessage(lead, senderName));
  const [stats, setStats] = useState<SendStats>(() => getSendStats());

  useEffect(() => {
    setMessage(buildFirstContactMessage(lead, senderName));
    setStats(getSendStats());
  }, [lead.id, senderName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Mensagem copiada.');
    } catch {
      toast.error('Não foi possível copiar a mensagem.');
    }
  };

  const handleSend = () => {
    if (!phoneOk) {
      toast.error('Este lead não tem um número de WhatsApp válido.');
      return;
    }
    if (!stats.safe) {
      toast.error('Ritmo de envio no limite. Aguarde um pouco para proteger o número.');
      return;
    }
    window.open(whatsappLink(contactNumber, message), '_blank', 'noopener,noreferrer');
    recordContact(lead, senderName);
    setStats(getSendStats());
    addLeadReport(
      lead.id,
      `${CONTACT_REPORT_PREFIX} para ${lead.nome_decisor || lead.name} (mensagem institucional M.I.).`
    ).catch(() => undefined);
    toast.success('WhatsApp aberto. É só confirmar o envio na conversa.');
    onSent?.(lead);
    onClose?.();
  };

  const body = (
    <div className="space-y-4">
      {/* Resumo do lead */}
      <div className="rounded-xl border border-border bg-accent/40 p-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn('w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold', avatarColor(lead.name))}>
            {initials(lead.name)}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{lead.name || 'Sem nome'}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
              {lead.category && (
                <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{lead.category}</span>
              )}
              {lead.city && (
                <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}{lead.state ? `/${lead.state}` : ''}</span>
              )}
              {contactNumber && (
                <span className="inline-flex items-center gap-1 font-mono-num"><Phone className="w-3 h-3" />{contactNumber}</span>
              )}
            </div>
          </div>
        </div>
        {lead.nome_decisor && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Falar com <span className="text-foreground font-medium">{lead.nome_decisor}</span>
          </p>
        )}
      </div>

      {/* Mensagem */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-muted-foreground">Mensagem de primeiro contato</p>
          <span className="text-[11px] text-muted-foreground font-mono-num">{message.length} caracteres</span>
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[200px] text-sm bg-background border-input focus:border-gold-500 focus:ring-gold-500 custom-scrollbar"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Editável — ajuste o texto antes de enviar. Evite links e anexos no primeiro contato.
        </p>
      </div>

      {/* Ritmo de envio */}
      <div
        className={cn(
          'rounded-xl border p-3 text-xs flex items-start gap-2',
          stats.safe
            ? 'border-emerald-500/30 bg-emerald-500/5 text-muted-foreground'
            : 'border-amber-500/40 bg-amber-500/5 text-amber-600'
        )}
      >
        {stats.safe ? (
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">
            Envios: {stats.lastHour} na última hora · {stats.lastDay} nas últimas 24h
          </p>
          <p>{stats.message}</p>
          <p className="text-[11px] text-muted-foreground">
            Recomendado: até {SAFE_LIMITS.perHour}/hora e {SAFE_LIMITS.perDay}/dia por número.
          </p>
        </div>
      </div>

      {!phoneOk && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Número inválido ou ausente nos dados do lead.
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <Button variant="outline" className="sm:flex-1 h-11 rounded-xl" onClick={handleCopy}>
          <Copy className="w-4 h-4 mr-2" /> Copiar mensagem
        </Button>
        <Button
          className="sm:flex-[1.4] h-11 rounded-xl bg-gold-500 text-black hover:bg-gold-600 font-semibold"
          onClick={handleSend}
          disabled={!phoneOk || !stats.safe || !message.trim()}
        >
          <ExternalLink className="w-4 h-4 mr-2" /> Abrir WhatsApp e enviar
        </Button>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        Envio manual pelo seu próprio WhatsApp — sem automação e dentro das regras da Meta.
      </p>
    </div>
  );

  if (inline) return body;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-4 custom-scrollbar" onClick={onClose}>
      <div
        className="my-auto w-full max-w-lg rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gold-500/15 flex items-center justify-center">
              <MessageCircle className="w-4.5 h-4.5 text-gold-500" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground leading-tight">Primeiro contato</h2>
              <p className="text-[11px] text-muted-foreground">Mensagem pronta para o WhatsApp</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} aria-label="Fechar">
            <X className="w-4 h-4" />
          </Button>
        </div>
        {body}
      </div>
    </div>
  );
}

interface ModalProps {
  lead: Lead | null;
  onClose: () => void;
  onSent?: (lead: Lead) => void;
}

export function FirstContactModal({ lead, onClose, onSent }: ModalProps) {
  if (!lead) return null;
  return (
    <Portal>
      <FirstContactComposer lead={lead} onClose={onClose} onSent={onSent} />
    </Portal>
  );
}

export function FirstContactBadge() {
  return (
    <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
      <ShieldCheck className="w-3 h-3" /> Contato assistido
    </Badge>
  );
}
