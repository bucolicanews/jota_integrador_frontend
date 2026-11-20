import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileText, Loader2, ReceiptText, X } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import {
  aprovarNotaServico,
  listarNotasServicoPendentes,
  obterDanfse,
  obterDetalheNotaServico,
  obterPainelNotasServico,
  rejeitarNotaServico,
} from '../servicos/notasServico';
import { showError, showSuccess } from '../utils/toast';
import PainelNotasServico from '../components/notas-servico/PainelNotasServico';

// Sem limite de data -- mesmo princípio de NotasFiscais.tsx: filtro é por EMISSÃO (do DPS),
// não por quando foi aprovada/rejeitada no sistema.
const DATA_INICIO_SEM_LIMITE = '2000-01-01';

const FILTROS: { chave: 'capturada' | 'aprovada' | 'rejeitada' | 'todas'; rotulo: string }[] = [
  { chave: 'capturada', rotulo: 'Pendentes' },
  { chave: 'aprovada', rotulo: 'Aprovadas' },
  { chave: 'rejeitada', rotulo: 'Rejeitadas' },
  { chave: 'todas', rotulo: 'Todas' },
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
const formatarData = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

function BadgeDirecao({ direcao }: { direcao: 'entrada' | 'saida' }) {
  return <Badge variant={direcao === 'entrada' ? 'warning' : 'success'}>{direcao === 'entrada' ? 'Tomado' : 'Prestado'}</Badge>;
}

function BadgeStatus({ status }: { status: string }) {
  if (status === 'aprovada') return <Badge variant="success">Aprovada</Badge>;
  if (status === 'rejeitada') return <Badge variant="destructive">Rejeitada</Badge>;
  return <Badge variant="warning">Pendente</Badge>;
}

export default function NotasServico() {
  const { empresaId } = useEmpresaAtiva();
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'capturada' | 'aprovada' | 'rejeitada' | 'todas'>('capturada');
  const [anoFiltro, setAnoFiltro] = useState('todos');
  const [mesFiltro, setMesFiltro] = useState('todos');
  const [baixandoDanfseId, setBaixandoDanfseId] = useState<string | null>(null);
  const tabelaRef = useRef<HTMLDivElement>(null);

  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<any>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [aprovandoId, setAprovandoId] = useState<string | null>(null);
  const [dialogRejeitar, setDialogRejeitar] = useState<{ id: string } | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [rejeitando, setRejeitando] = useState(false);
  const [versaoPainel, setVersaoPainel] = useState(0);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    if (filtroStatus === 'capturada') {
      listarNotasServicoPendentes(empresaId)
        .then(setItens)
        .catch((erro) => showError(erro.message))
        .finally(() => setCarregando(false));
      return;
    }
    const hoje = new Date();
    obterPainelNotasServico(empresaId, DATA_INICIO_SEM_LIMITE, hoje.toISOString().slice(0, 10))
      .then((lista: any[]) => setItens(filtroStatus === 'todas' ? lista : lista.filter((i) => i.status === filtroStatus)))
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId, filtroStatus]);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set(itens.map((item: any) => item.dataEmissaoDps.slice(0, 4)));
    const anoAtual = String(new Date().getFullYear());
    anos.add(anoAtual);
    return Array.from(anos).sort((a, b) => b.localeCompare(a));
  }, [itens]);

  const itensExibidos = useMemo(() => {
    if (anoFiltro === 'todos' && mesFiltro === 'todos') return itens;
    return itens.filter((item: any) => {
      const [ano, mes] = item.dataEmissaoDps.slice(0, 7).split('-');
      if (anoFiltro !== 'todos' && ano !== anoFiltro) return false;
      if (mesFiltro !== 'todos' && mes !== mesFiltro) return false;
      return true;
    });
  }, [itens, anoFiltro, mesFiltro]);

  function selecionarFiltro(status: 'capturada' | 'aprovada' | 'rejeitada' | 'todas') {
    setFiltroStatus(status);
    tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function verDanfse(id: string) {
    if (!empresaId) return;
    setBaixandoDanfseId(id);
    try {
      const blob = await obterDanfse(empresaId, id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível gerar o DANFSe');
    } finally {
      setBaixandoDanfseId(null);
    }
  }

  function abrirDetalhe(id: string) {
    if (!empresaId) return;
    setDetalheId(id);
    setCarregandoDetalhe(true);
    obterDetalheNotaServico(empresaId, id)
      .then(setDetalhe)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregandoDetalhe(false));
  }

  async function aprovar(id: string) {
    if (!empresaId) return;
    setAprovandoId(id);
    try {
      await aprovarNotaServico(empresaId, id);
      showSuccess('NFS-e aprovada.');
      setDetalheId(null);
      setVersaoPainel((v) => v + 1);
      carregar();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível aprovar a NFS-e');
    } finally {
      setAprovandoId(null);
    }
  }

  function abrirDialogRejeitar(id: string) {
    setDialogRejeitar({ id });
    setMotivoRejeicao('');
  }

  async function rejeitar() {
    if (!empresaId || !dialogRejeitar || !motivoRejeicao.trim()) return;
    setRejeitando(true);
    try {
      await rejeitarNotaServico(empresaId, dialogRejeitar.id, motivoRejeicao.trim());
      showSuccess('NFS-e rejeitada.');
      setDialogRejeitar(null);
      setDetalheId(null);
      setVersaoPainel((v) => v + 1);
      carregar();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível rejeitar a NFS-e');
    } finally {
      setRejeitando(false);
    }
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <ReceiptText className="mr-2 h-6 w-6" /> Notas de Serviço (NFS-e)
        </h1>
      </div>

      <PainelNotasServico empresaId={empresaId} onSelecionarFiltro={selecionarFiltro} chaveRecarga={versaoPainel} />

      <div ref={tabelaRef} className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Button
              key={f.chave}
              type="button"
              size="sm"
              variant={filtroStatus === f.chave ? 'default' : 'outline'}
              onClick={() => selecionarFiltro(f.chave)}
            >
              {f.rotulo}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <div>
            <Label className="mb-1 block text-xs">Mês</Label>
            <Select value={mesFiltro} onValueChange={setMesFiltro}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {MESES.map((nome, indice) => (
                  <SelectItem key={nome} value={String(indice + 1).padStart(2, '0')}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Ano</Label>
            <Select value={anoFiltro} onValueChange={setAnoFiltro}>
              <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {anosDisponiveis.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Direção</TableHead>
                    <TableHead>Nº NFS-e</TableHead>
                    <TableHead>Contraparte</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead className="text-right">Valor líquido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensExibidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Nenhuma NFS-e {filtroStatus === 'capturada' ? 'pendente de revisão' : 'neste filtro'}. O agente local sincroniza
                        automaticamente conforme novos XML chegam.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itensExibidos.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <BadgeDirecao direcao={item.direcao} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.numeroNfse}</TableCell>
                        <TableCell className="text-sm">{item.direcao === 'entrada' ? item.emitenteNome : item.tomadorNome ?? '—'}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm" title={item.descricaoServico}>{item.descricaoServico}</TableCell>
                        <TableCell className="text-sm">{formatarData(item.dataEmissaoDps)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatarMoeda(item.valorLiquido)}</TableCell>
                        <TableCell>
                          <BadgeStatus status={item.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={baixandoDanfseId === item.id}
                              title="Ver DANFSe"
                              onClick={() => verDanfse(item.id)}
                            >
                              {baixandoDanfseId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => abrirDetalhe(item.id)}>
                              Ver detalhe
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detalheId} onOpenChange={(aberto) => !aberto && setDetalheId(null)}>
        <DialogContent className="max-w-md md:max-w-[85%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detalhe ? `NFS-e nº${detalhe.numeroNfse}` : 'Carregando...'}</DialogTitle>
          </DialogHeader>

          {carregandoDetalhe || !detalhe ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Direção</Label>
                  <div>
                    <BadgeDirecao direcao={detalhe.direcao} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Emissão (DPS)</Label>
                  <p>{formatarData(detalhe.dataEmissaoDps)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor líquido</Label>
                  <p className="font-mono">{formatarMoeda(detalhe.valorLiquido)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Chave de acesso</Label>
                  <p className="break-all font-mono text-xs">{detalhe.chaveAcesso}</p>
                </div>
              </div>

              {detalhe.status === 'rejeitada' && detalhe.motivoRejeicao && (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
                  Rejeitada -- motivo: {detalhe.motivoRejeicao}
                </p>
              )}

              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Prestador</Label>
                  <p>{detalhe.emitenteNome}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tomador</Label>
                  <p>{detalhe.tomadorNome ?? '—'}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Serviço</Label>
                <p className="text-sm">{detalhe.descricaoServico}</p>
                {detalhe.codigoTributacaoNacional && (
                  <p className="font-mono text-xs text-muted-foreground">cTribNac {detalhe.codigoTributacaoNacional}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Base de cálculo</Label>
                  <p className="font-mono">{formatarMoeda(detalhe.valorBaseCalculo)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ISSQN</Label>
                  <p className="font-mono">{formatarMoeda(detalhe.valorIssqn)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Situação</Label>
                  <p className="font-mono">{detalhe.situacao}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => verDanfse(detalhe.id)} disabled={baixandoDanfseId === detalhe.id}>
                  {baixandoDanfseId === detalhe.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1 h-3.5 w-3.5" />}
                  Ver DANFSe
                </Button>
                {detalhe.status === 'capturada' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => abrirDialogRejeitar(detalhe.id)} disabled={aprovandoId === detalhe.id}>
                      <X className="mr-1 h-3.5 w-3.5" /> Rejeitar
                    </Button>
                    <Button size="sm" onClick={() => aprovar(detalhe.id)} disabled={aprovandoId === detalhe.id}>
                      {aprovandoId === detalhe.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                      Aprovar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!dialogRejeitar} onOpenChange={(aberto) => !aberto && setDialogRejeitar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar NFS-e</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-rejeicao-servico">Motivo</Label>
            <Textarea id="motivo-rejeicao-servico" value={motivoRejeicao} onChange={(e) => setMotivoRejeicao(e.target.value)} maxLength={500} rows={3} />
          </div>
          <Button onClick={rejeitar} disabled={!motivoRejeicao.trim() || rejeitando} className="w-full">
            {rejeitando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar rejeição'}
          </Button>
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
