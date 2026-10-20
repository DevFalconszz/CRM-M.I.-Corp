import { Lead, LeadStatus } from './types';

/**
 * Primeiro contato assistido (envio manual pelo WhatsApp oficial).
 *
 * Não há automação de envio: a mensagem é montada aqui e aberta no WhatsApp
 * Web/App do próprio SDR via link wa.me. O disparo continua sendo um ato humano,
 * o que mantém a operação dentro dos Termos de Uso do WhatsApp/Meta.
 */

export const MI_BRAND = 'M.I. Marketing & Inteligência';
export const MI_SITE = 'https://mi-corp.com.br';
export const MI_SLOGAN = 'Resultados não acontecem; nós construímos.';
export const MI_SERVICES =
  'gestão de tráfego pago, marketing estratégico, social media, criação de sites e automações com IA';

/**
 * Status após o primeiro contato: só avança etapas iniciais.
 * Leads em follow-up, reunião, venda ou recusado mantêm o estágio atual.
 */
export function statusAfterContact(current: LeadStatus): LeadStatus {
  if (current === 'analise_pendente' || current === 'em_analise' || current === 'ponto_contato') {
    return 'mensagem_enviada';
  }
  return current;
}

/** Posição de contato do lead: decisor primeiro, depois telefone da empresa. */
export function getLeadContactNumber(lead: Lead): string {
  return (lead.numero_decisor || lead.phone || '').trim();
}

/** Normaliza para o formato aceito pelo wa.me (apenas dígitos, com DDI). */
export function normalizeWhatsAppNumber(raw: string, defaultCountry = '55'): string {
  let digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';

  // Remove zeros de operadora/DDD no início (ex.: 017...).
  digits = digits.replace(/^0+/, '');

  // Já veio com DDI brasileiro.
  if (digits.startsWith(defaultCountry) && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `${defaultCountry}${digits}`;
  }

  return digits;
}

export function isValidWhatsAppNumber(raw: string): boolean {
  const digits = normalizeWhatsAppNumber(raw);
  return digits.length >= 12 && digits.length <= 15;
}

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(number)}?text=${encodeURIComponent(message)}`;
}

function firstNameOf(fullName: string): string {
  const clean = (fullName || '').trim();
  if (!clean) return '';
  return clean.split(/\s+/)[0];
}

/**
 * Mensagem de primeiro contato — curta, personalizada e sem links,
 * para reduzir risco de sinalização por spam.
 */
export function buildFirstContactMessage(lead: Lead, senderName = ''): string {
  const decisor = (lead.nome_decisor || '').trim();
  const empresa = (lead.name || '').trim();
  const cidade = [lead.city, lead.state].filter(Boolean).join('/');
  const sender = firstNameOf(senderName);

  const saudacao = decisor ? `Olá, ${firstNameOf(decisor)}! Tudo bem?` : 'Olá! Tudo bem?';

  const apresentacao = sender
    ? `Meu nome é ${sender}, falo pela ${MI_BRAND}.`
    : `Falo pela ${MI_BRAND}.`;

  const contexto = empresa
    ? `Encontrei a ${empresa}${cidade ? ` em ${cidade}` : ''} e vi um espaço real para crescermos juntos.`
    : 'Encontrei o seu negócio e vi um espaço real para crescermos juntos.';

  return [
    saudacao,
    '',
    apresentacao,
    '',
    contexto,
    '',
    `Trabalhamos com ${MI_SERVICES} — sempre com foco em resultado, não em vaidade de métrica.`,
    '',
    `Nosso lema: ${MI_SLOGAN}`,
    '',
    'Faz sentido conversarmos 15 minutos esta semana? Me diz o melhor horário que eu me organizo.',
    '',
    'Abraço,',
    sender || 'Equipe M.I.',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Ritmo de envio (proteção contra bloqueio)                           */
/* ------------------------------------------------------------------ */

export const SAFE_LIMITS = {
  perHour: 15,
  perDay: 40,
};

const LOG_KEY = 'mi_first_contact_log_v1';

export interface ContactLogEntry {
  leadId: string;
  leadName: string;
  at: string; // ISO
  by: string;
}

function readLog(): ContactLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContactLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLog(entries: ContactLogEntry[]) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-200)));
  } catch {
    // storage cheio/indisponível — segue sem histórico
  }
}

export function recordContact(lead: Lead, senderName = ''): void {
  const entries = readLog().filter((e) => e.leadId !== lead.id);
  entries.push({
    leadId: lead.id,
    leadName: lead.name,
    at: new Date().toISOString(),
    by: senderName,
  });
  writeLog(entries);
}

export function getLastContact(leadId: string): ContactLogEntry | null {
  return readLog().find((e) => e.leadId === leadId) ?? null;
}

export interface SendStats {
  lastHour: number;
  lastDay: number;
  lastSentAt: string | null;
  safe: boolean;
  message: string;
}

export function getSendStats(): SendStats {
  const now = Date.now();
  const entries = readLog();
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const lastHour = entries.filter((e) => new Date(e.at).getTime() >= hourAgo).length;
  const lastDay = entries.filter((e) => new Date(e.at).getTime() >= dayAgo).length;

  const sorted = [...entries].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const lastSentAt = sorted[0]?.at ?? null;

  let message = 'Ritmo seguro para o seu número.';
  if (lastHour >= SAFE_LIMITS.perHour) {
    message = `Limite recomendado por hora atingido (${lastHour}/${SAFE_LIMITS.perHour}). Faça uma pausa antes de continuar.`;
  } else if (lastDay >= SAFE_LIMITS.perDay) {
    message = `Limite recomendado diário atingido (${lastDay}/${SAFE_LIMITS.perDay}). Retome amanhã.`;
  } else if (lastHour >= Math.round(SAFE_LIMITS.perHour * 0.7)) {
    message = `Atenção: ${lastHour} envios na última hora. Vá com calma para proteger o número.`;
  }

  return {
    lastHour,
    lastDay,
    lastSentAt,
    safe: lastHour < SAFE_LIMITS.perHour && lastDay < SAFE_LIMITS.perDay,
    message,
  };
}

export function canSendNow(): boolean {
  return getSendStats().safe;
}
