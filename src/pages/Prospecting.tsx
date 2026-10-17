import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StructuredResult } from '@/lib/opencode-api';
import { searchLeadsLocal, isLocalServerRunning } from '@/lib/opencode-api';
import { searchBusinesses } from '@/lib/firecrawl-api';
import { detectAds } from '@/lib/detect-ads';
import { enrichPhones } from '@/lib/enrich-phone';
import { insertLead } from '@/lib/leads-store';
import { loadSavedLeadsIndex, isResultSaved, filterResultsBySaved, nameKey } from '@/lib/lead-dedup';
import { Lead } from '@/lib/types';
import { searchLeadsPaged } from '@/lib/search-paged';
import { Search, Plus, Loader2, Globe, ExternalLink, AlertTriangle, CheckCircle, Zap, Wifi, WifiOff, Megaphone, Instagram, User } from 'lucide-react';
import { adLibraryUrl, adLibraryQueryTerm } from '@/lib/ad-library';
import { inferUf } from '@/lib/uf';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isLocal } from '@/lib/env-check';

const RESULTS_KEY = 'prospecting_results_v1';

interface PersistedResults {
  niche: string;
  city: string;
  results: StructuredResult[];
}

export default function Prospecting() {
  const { user } = useAuth();
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [results, setResults] = useState<StructuredResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [localMode, setLocalMode] = useState(false);

  useEffect(() => {
    isLocalServerRunning().then(running => setLocalMode(running));
  }, []);

  // Restaura a última pesquisa ao voltar para a página (não some ao trocar de aba/recarregar),
  // mas remove desta lista qualquer resultado que já tenha sido salvo nos leads.
  useEffect(() => {
    (async () => {
      try {
        const raw = sessionStorage.getItem(RESULTS_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as PersistedResults;
        if (!Array.isArray(saved.results) || saved.results.length === 0) return;
        setNiche(saved.niche || '');
        setCity(saved.city || '');
        const index = await loadSavedLeadsIndex();
        const kept = filterResultsBySaved(saved.results, index);
        setResults(kept);
      } catch {
        // ignora dados corrompidos
      }
    })();
  }, []);

  // Persiste os resultados sempre que forem atualizados (nova busca sobrescreve).
  useEffect(() => {
    if (!loading && Array.isArray(results) && results.length > 0) {
      const payload: PersistedResults = { niche, city, results };
      try {
        sessionStorage.setItem(RESULTS_KEY, JSON.stringify(payload));
      } catch {
        // ignora falha de storage (ex: quota)
      }
    }
  }, [results, loading, niche, city]);

  const enrichResults = async (list: StructuredResult[]): Promise<StructuredResult[]> => {
    const items = list.map((r) => ({ name: r.name, website: r.website, phone: r.phone, city }));
    const [adsMap, phones] = await Promise.all([
      detectAds(list.map((r) => ({ businessName: r.name, website: r.website, city, instagram: r.instagram }))),
      enrichPhones(items),
    ]);
    return list.map((r) => {
      const key = r.website || r.name;
      const newPhone = phones.map[key];
      const ads = adsMap[key];
      return {
        ...r,
        has_ads: ads?.has_ads ?? r.has_ads,
        google_ads_count: ads?.google_ads_count,
        meta_has_ads: ads?.meta_has_ads,
        instagram_found: ads?.instagram_found || r.instagram,
        phone: newPhone && newPhone !== r.phone ? newPhone : r.phone,
      };
    });
  };

  // Busca paginada com deduplicação assertiva: resultados que já estão nos leads
  // (por nome, telefone, site, mapa ou place id) são filtrados antes de aparecer.
  const searchWithDedup = async (niche: string, city: string, targetCount: number = 20): Promise<StructuredResult[]> => {
    const index = await loadSavedLeadsIndex();
    const newResults: StructuredResult[] = [];
    let page = 1;
    const numPerPage = 20;
    const maxPages = 10; // segurança

    while (newResults.length < targetCount && page <= maxPages) {
      const res = await searchLeadsPaged(niche, city, page, numPerPage);
      if (!res.success || !res.data || res.data.length === 0) break;

      for (const r of res.data) {
        const key = nameKey(r.name || '');
        if (!key) continue;
        if (isResultSaved(r, index)) continue; // já salvo (qualquer critério)
        if (newResults.some((nr) => nameKey(nr.name || '') === key)) continue; // duplicado na mesma busca
        // Infere UF se não veio
        const enriched = {
          ...r,
          state: r.state || inferUf(r.city) || inferUf(city),
        };
        newResults.push(enriched);
        if (newResults.length >= targetCount) break;
      }
      page++;
    }
    return newResults.slice(0, targetCount);
  };

  const handleSearch = async () => {
    if (!niche.trim() || !city.trim()) {
      toast.error('Preencha o nicho e a cidade.');
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      if (localMode) {
        const res = await searchLeadsLocal(niche, city);
        if (res.success && res.data && res.data.length > 0) {
          const index = await loadSavedLeadsIndex();
          const kept = filterResultsBySaved(res.data, index);
          if (kept.length > 0) {
            setResults(await enrichResults(kept));
            toast.success(`${kept.length} resultados encontrados!`);
          } else {
            toast.info('Todos os resultados já estão salvos ou nenhum encontrado.');
          }
        } else {
          toast.error(res.error || 'Nenhum resultado encontrado.');
        }
      } else {
        const found = await searchWithDedup(niche, city, 20);
        if (found.length > 0) {
          setResults(await enrichResults(found));
          toast.success(`${found.length} resultados novos encontrados!`);
        } else {
          toast.info('Todos os resultados já estão salvos ou nenhum encontrado.');
        }
      }
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        toast.error('A busca está demorando mais que o esperado. Tente novamente.');
      } else {
        toast.error(err?.message || 'Erro ao buscar leads. Tente novamente em instantes.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (result: StructuredResult) => {
    if (saving) return;
    setSaving(true);
    try {
      const toStr = (v: any) => v != null ? String(v) : '';

      const leadCity = toStr(result.city) || city;
      const leadState = toStr(result.state) || inferUf(leadCity) || inferUf(city);
      const responsavel = user?.user_metadata?.full_name || user?.email || '';

      const lead: Omit<Lead, 'id'> = {
        name: toStr(result.name) || 'Sem nome', title: toStr(result.title),
        category: toStr(result.category) || niche, address: toStr(result.address),
        city: leadCity, state: leadState,
        phone: toStr(result.phone), website: toStr(result.website),
        google_maps_url: toStr(result.google_maps_url), rating: toStr(result.rating),
        reviews_count: toStr(result.reviews_count), instagram: toStr(result.instagram),
        responsavel: responsavel, descricao: '', status: 'analise_pendente',
        whatsapp_group: '', meeting_dates: [], nome_decisor: '', numero_decisor: '',
        has_ads: result.has_ads ?? null,
        meta_has_ads: result.meta_has_ads ?? null,
        google_ads_count: result.google_ads_count ?? 0,
        source: 'prospeccao',
      };

      const inserted = await insertLead(lead);
      if (inserted) {
        toast.success(`"${result.name}" adicionado aos leads!`);
        if (addingIndex !== null) {
          const updated = results.filter((_, i) => i !== addingIndex);
          setResults(updated);
          try {
            sessionStorage.setItem(
              RESULTS_KEY,
              JSON.stringify({ niche, city, results: updated })
            );
          } catch {}
        }
        setAddingIndex(null);
        setResponsavel('');
      } else {
        toast.error('Erro ao adicionar lead.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <Card className="mb-6 border border-border shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              {localMode ? (
                <Zap className="w-5 h-5 text-gold-500" />
              ) : (
                <Search className="w-5 h-5 text-muted-foreground" />
              )}
              Prospectar Novos Leads
              {localMode ? (
                <span className="ml-auto flex items-center gap-1 text-xs font-mono text-gold-500 bg-gold-500/10 border border-gold-500/30 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" /> IA Local
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1 text-xs font-mono text-green-500 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">
                  <Wifi className="w-3 h-3" /> Modo Online
                </span>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Mostra apenas estabelecimentos <strong>sem site</strong> ou <strong>sem anúncios/campanhas ativas</strong> &mdash; oportunidades reais de venda.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input className="h-12 text-sm rounded-xl flex-1 bg-background border-input focus:border-gold-500 focus:ring-gold-500" placeholder="Nicho (ex: Clínica Odontológica, Restaurante...)" value={niche} onChange={(e) => setNiche(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <Input className="h-12 text-sm rounded-xl flex-1 bg-background border-input focus:border-gold-500 focus:ring-gold-500" placeholder="Cidade (ex: São Paulo, Curitiba...)" value={city} onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <Button className="h-12 rounded-xl px-8 text-sm font-semibold min-w-[140px] bg-gold-500 text-black hover:bg-gold-600" onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Search className="w-4 h-4 mr-2" />Buscar</>)}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-gold-500" />
            <p className="text-sm text-muted-foreground">
              {localMode
                ? 'Pesquisando leads com IA via OpenCode...'
                : 'Buscando e filtrando estabelecimentos sem presença digital...'}
            </p>
            <p className="text-xs text-muted-foreground/60">Isso pode levar até 2 minutos</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium">
              {results.length} oportunidades para <span className="text-foreground font-semibold">"{niche}"</span> em <span className="text-foreground font-semibold">{city}</span>
            </p>

            <Card className="border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-accent/50">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Nome</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Nicho</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Cidade</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">UF</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Telefone</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Site</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Ads Google</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Ads Meta</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Verificar Anúncios</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, i) => (
                      <TableRow key={i} className="hover:bg-accent/40 border-border">
                        <TableCell>
                          <Button size="sm" className="h-8 w-8 p-0 rounded-lg bg-gold-500 text-black hover:bg-gold-600" onClick={() => setAddingIndex(i)} title="Adicionar aos leads">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate text-foreground">{result.name || '\u2014'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{niche || result.category || '\u2014'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{result.city || '\u2014'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{result.state || '\u2014'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{result.phone || '\u2014'}</TableCell>
                        <TableCell>
                          {result.has_website ? (
                            <Badge variant="outline" className="text-xs gap-1 border-border"><CheckCircle className="w-3 h-3 text-green-500" />Sim</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="w-3 h-3" />Sem site</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.google_ads_count != null ? (
                            result.google_ads_count > 0 ? (
                              <Badge variant="outline" className="text-xs gap-1 border-green-500/40 text-green-600 bg-green-500/10">
                                <Megaphone className="w-3 h-3" />
                                {result.google_ads_count} {result.google_ads_count === 1 ? 'anúncio' : 'anúncios'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1 border-border text-muted-foreground">
                                <Megaphone className="w-3 h-3" />Sem anúncio
                              </Badge>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.meta_has_ads != null ? (
                            result.meta_has_ads ? (
                              <Badge variant="outline" className="text-xs gap-1 border-violet-500/40 text-violet-600 bg-violet-500/10">
                                <Instagram className="w-3 h-3" />Tem anúncio
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1 border-border text-muted-foreground">
                                <Instagram className="w-3 h-3" />Sem anúncio
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="text-xs gap-1 border-border text-muted-foreground" title="Verificação manual via Ad Library">
                              <Instagram className="w-3 h-3" />Por verificar
                            </Badge>
                          )}
                          {result.instagram_found && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">@{result.instagram_found}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 w-auto min-w-0 px-3 py-1.5 bg-gold-500 text-black hover:bg-gold-600 font-medium"
                            asChild
                          >
                            <a
                              href={adLibraryUrl(adLibraryQueryTerm(result.instagram, result.name))}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-3 h-3 mr-1.5" />
                              Ver na Ad Library
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-foreground">Busque novos leads</p>
            <p className="text-sm mt-1">Digite o nicho e a cidade para encontrar oportunidades.</p>
          </div>
        )}
      </main>

      <Dialog open={addingIndex !== null} onOpenChange={(o) => !o && setAddingIndex(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg text-foreground">Adicionar aos Leads</DialogTitle>
          </DialogHeader>
          {addingIndex !== null && results[addingIndex] && (
            <div className="space-y-4">
              <div className="bg-accent rounded-xl p-3 space-y-1 border border-border">
                <p className="font-semibold text-sm truncate text-foreground">{results[addingIndex].name}</p>
                <p className="text-xs text-muted-foreground">{niche || results[addingIndex].category} &bull; {results[addingIndex].city}/{results[addingIndex].state}</p>
                {results[addingIndex].phone && <p className="text-xs text-muted-foreground">{'\uD83D\uDCDE'} {results[addingIndex].phone}</p>}
                <div className="flex gap-2 mt-1">
                  {!results[addingIndex].has_website && <Badge variant="destructive" className="text-[10px]">Sem site</Badge>}
                  {results[addingIndex].google_ads_count != null && (
                    results[addingIndex].google_ads_count > 0 ? (
                      <Badge variant="outline" className="text-[10px] gap-1 border-green-500/40 text-green-600 bg-green-500/10">
                        <Megaphone className="w-3 h-3" /> {results[addingIndex].google_ads_count} anúncio{results[addingIndex].google_ads_count > 1 ? 's' : ''} (Google)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 border-border text-muted-foreground">
                        <Megaphone className="w-3 h-3" /> Sem anúncio no Google
                      </Badge>
                    )
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 w-auto min-w-0 px-3 py-1.5 bg-gold-500 text-black hover:bg-gold-600 font-medium"
                    asChild
                  >
                    <a
                      href={adLibraryUrl(adLibraryQueryTerm(results[addingIndex].instagram, results[addingIndex].name))}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-3 h-3 mr-1.5" />
                      Ver na Ad Library
                    </a>
                  </Button>
                </div>
              </div>
              <div className="bg-accent rounded-xl px-3 py-2.5 text-sm text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Responsável automático:</span>
                <span className="font-medium truncate">{user?.user_metadata?.full_name || user?.email || ''}</span>
              </div>
              <Button className="w-full h-12 rounded-xl text-sm font-semibold bg-gold-500 text-black hover:bg-gold-600" onClick={() => handleAddLead(results[addingIndex])} disabled={saving}>
                <Plus className="w-4 h-4 mr-2" />{saving ? 'Adicionando...' : 'Adicionar Lead'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
