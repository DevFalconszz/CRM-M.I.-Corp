import { supabase } from '@/integrations/supabase/client';

export interface LeadFingerprint {
  id: string;
  name: string | null;
  phone: string | null;
  website: string | null;
  google_maps_url: string | null;
  source_place_id: string | null;
  city: string | null;
}

// Hosts genéricos (redes sociais/plataformas) não identificam um negócio específico.
const GENERIC_HOSTS = new Set([
  'facebook.com', 'facebook.com.br', 'm.facebook.com', 'instagram.com',
  'youtube.com', 'youtu.be', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com',
  'google.com', 'google.com.br', 'maps.google.com', 'g.page', 'goo.gl',
  'wa.me', 'whatsapp.com', 'api.whatsapp.com', 'web.whatsapp.com',
  'bit.ly', 'linktr.ee', 'linktr.ee', 'm.me', 'gmail.com', 'outlook.com',
]);

/** Normaliza texto: minúsculas, remove acentos e espaços extras. */
export function normalizeKey(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function nameKey(value: string): string {
  return normalizeKey(value || '');
}

export function phoneKey(value: string): string {
  return (value || '').replace(/\D/g, '');
}

export function websiteHostKey(url: string): string {
  const u = (url || '').trim();
  if (!u) return '';
  try {
    const parsed = new URL(u.startsWith('http') ? u : `https://${u}`);
    const host = parsed.host.toLowerCase().replace(/^www\./, '');
    if (GENERIC_HOSTS.has(host)) return '';
    return host;
  } catch {
    return '';
  }
}

export function mapsKey(url: string): string {
  const u = (url || '').trim().toLowerCase();
  if (!u) return '';
  const cid = u.match(/cid=(\d+)/);
  if (cid) return `cid:${cid[1]}`;
  try {
    const parsed = new URL(u.startsWith('http') ? u : `https://${u}`);
    const host = parsed.host.toLowerCase().replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/+$/, '');
    // URL só de coordenadas (google.com/...@-20.5,-49.3,17z) é genérica demais; ignora.
    const hasCoords = parsed.search.includes('!4d') || parsed.search.includes('!3d');
    if (host.includes('google.') && (hasCoords || !path)) return '';
    return `${host}${path}`;
  } catch {
    return '';
  }
}

export function placeKey(placeId: string): string {
  return normalizeKey(placeId || '');
}

export interface SavedLeadsIndex {
  names: Set<string>;
  phones: Set<string>;
  websites: Set<string>;
  maps: Set<string>;
  places: Set<string>;
}

/** Monta o índice de leads já salvos a partir das impressões digitais. */
export function buildSavedLeadsIndex(items: LeadFingerprint[]): SavedLeadsIndex {
  const index: SavedLeadsIndex = {
    names: new Set(),
    phones: new Set(),
    websites: new Set(),
    maps: new Set(),
    places: new Set(),
  };
  for (const it of items) {
    const nk = nameKey(it.name || '');
    if (nk) index.names.add(nk);
    const pk = phoneKey(it.phone || '');
    if (pk) index.phones.add(pk);
    const wk = websiteHostKey(it.website || '');
    if (wk) index.websites.add(wk);
    const mk = mapsKey(it.google_maps_url || '');
    if (mk) index.maps.add(mk);
    const lk = placeKey(it.source_place_id || '');
    if (lk) index.places.add(lk);
  }
  return index;
}

export interface SearchResultLike {
  name?: string | null;
  phone?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  source_place_id?: string | null;
}

/**
 * Critério assertivo: se QUALQUER uma das checagens (nome, telefone, site,
 * lugar no Google Maps ou place id) bater com um lead salvo, considera o
 * resultado como já adicionado e deve ser filtrado — evitando gastar créditos.
 */
export function isResultSaved(
  r: SearchResultLike,
  index: SavedLeadsIndex
): boolean {
  const nk = nameKey(r.name || '');
  if (nk && index.names.has(nk)) return true;

  const pk = phoneKey(r.phone || '');
  if (pk && index.phones.has(pk)) return true;

  const wk = websiteHostKey(r.website || '');
  if (wk && index.websites.has(wk)) return true;

  const mk = mapsKey(r.google_maps_url || '');
  if (mk && index.maps.has(mk)) return true;

  const lk = placeKey(r.source_place_id || '');
  if (lk && index.places.has(lk)) return true;

  return false;
}

/** Remove da lista todo resultado que já exista no banco. */
export function filterResultsBySaved<T extends SearchResultLike>(
  results: T[],
  index: SavedLeadsIndex
): T[] {
  return results.filter((r) => !isResultSaved(r, index));
}

/**
 * Carrega os leads salvos (global, via RPC que ignora RLS) e monta o índice.
 * Em falha, cai para os leads visíveis ao usuário logado.
 */
export async function loadSavedLeadsIndex(): Promise<SavedLeadsIndex> {
  const { data, error } = await (supabase.rpc as any)('get_all_lead_fingerprints');
  if (!error && Array.isArray(data) && data.length > 0) {
    return buildSavedLeadsIndex(data as LeadFingerprint[]);
  }
  if (error) console.error('Erro ao carregar leads salvos (global):', error);
  const { data: local } = await supabase
    .from('leads')
    .select('id,name,phone,website,google_maps_url,source_place_id,city');
  return buildSavedLeadsIndex((local || []) as LeadFingerprint[]);
}
/** Adiciona fingerprint de um lead recém-inserido ao índice em memória (reutilizável). */
export function appendSavedLead(index: SavedLeadsIndex, lead: Partial<LeadFingerprint> & { id: string }): SavedLeadsIndex {
  const names = new Set(index.names);
  const phones = new Set(index.phones);
  const websites = new Set(index.websites);
  const maps = new Set(index.maps);
  const places = new Set(index.places);

  const nk = nameKey(lead.name || '');
  if (nk) names.add(nk);

  const pk = phoneKey(lead.phone || '');
  if (pk) phones.add(pk);

  const wk = websiteHostKey(lead.website || '');
  if (wk) websites.add(wk);

  const mk = mapsKey(lead.google_maps_url || '');
  if (mk) maps.add(mk);

  const lk = placeKey(lead.source_place_id || '');
  if (lk) places.add(lk);

  return { names, phones, websites, maps, places };
}
