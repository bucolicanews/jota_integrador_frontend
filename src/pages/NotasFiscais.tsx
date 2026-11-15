import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Check, Download, Loader2, ReceiptText, X } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import {
  aprovarNotaFiscal,
  listarNotasFiscaisPendentes,
  obterDetalheNotaFiscal,
  obterPainelNotasFiscais,
  obterUrlXmlNotaFiscal,
  rejeitarNotaFiscal,
} from '../servicos/notasFiscais';
import { showError, showSuccess } from '../utils/toast';
import SecaoLancamentosNotasFiscais from '../components/empresas/SecaoLancamentosNotasFiscais';
import SecaoAgenteNotasFiscais from '../components/empresas/SecaoAgenteNotasFiscais';
import PainelNotasFiscais from '../components/notas-fiscais/PainelNotasFiscais';

const C_STAT_AUTORIZADA = 100;
// Sem limite de data -- filtro é por data de EMISSÃO da nota, não por quando foi
// aprovada/rejeitada. Usar janela de 30 dias aqui escondia nota antiga (backlog) recém
// aprovada, porque a emissão dela é antiga mesmo a ação sendo de hoje.
const DATA_INICIO_SEM_LIMITE = '2000-01-01';

const FILTROS: { chave: 'capturada' | 'aprovada' | 'rejeitada' | 'todas'; rotulo: string }[] = [
  { chave: 'capturada', rotulo: 'Pendentes' },
  { chave: 'aprovada', rotulo: 'Aprovadas' },
  { chave: 'rejeitada', rotulo: 'Rejeitadas' },
  { chave: 'todas', rotulo: 'Todas' },
];

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
const formatarData = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

// tPag do manual NFe 4.0 -- rótulo pt-BR pra exibição, código bruto nunca é alterado no banco.
const ROTULOS_FORMA_PAGAMENTO: Record<string, string> = {
  '01': 'Dinheiro',
  '02': 'Cheque',
  '03': 'Cartão de Crédito',
  '04': 'Cartão de Débito',
  '05': 'Crédito Loja',
  '10': 'Vale Alimentação',
  '11': 'Vale Refeição',
  '12': 'Vale Presente',
  '13': 'Vale Combustível',
  '14': 'Duplicata Mercantil',
  '15': 'Boleto Bancário',
  '16': 'Depósito Bancário',
  '17': 'PIX',
  '18': 'Transferência Bancária / Carteira Digital',
  '19': 'Fidelidade / Cashback',
  '90': 'Sem pagamento',
  '99': 'Outros',
};
const rotuloFormaPagamento = (codigo: string) => ROTULOS_FORMA_PAGAMENTO[codigo] ?? `Forma ${codigo}`;

function BadgeDirecao({ direcao }: { direcao: 'entrada' | 'saida' }) {
  return <Badge variant={direcao === 'entrada' ? 'warning' : 'success'}>{direcao === 'entrada' ? 'Entrada' : 'Saída'}</Badge>;
}

function BadgeStatus({ status }: { status: string }) {
  if (status === 'aprovada') return <Badge variant="success">Aprovada</Badge>;
  if (status === 'rejeitada') return <Badge variant="destructive">Rejeitada</Badge>;
  return <Badge variant="warning">Pendente</Badge>;
}

export default function NotasFiscais() {
  const { empresaId } = useEmpresaAtiva();
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'capturada' | 'aprovada' | 'rejeitada' | 'todas'>('capturada');
  const [baixandoXmlId, setBaixandoXmlId] = useState<string | null>(null);
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
      listarNotasFiscaisPendentes(empresaId)
        .then(setItens)
        .catch((erro) => showError(erro.message))
        .finally(() => setCarregando(false));
      return;
    }
    const hoje = new Date();
    obterPainelNotasFiscais(empresaId, DATA_INICIO_SEM_LIMITE, hoje.toISOString().slice(0, 10))
      .then((lista: any[]) => setItens(filtroStatus === 'todas' ? lista : lista.filter((i) => i.status === filtroStatus)))
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId, filtroStatus]);

  function selecionarFiltro(status: 'capturada' | 'aprovada' | 'rejeitada' | 'todas') {
    setFiltroStatus(status);
    tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function baixarXml(id: string) {
    if (!empresaId) return;
    setBaixandoXmlId(id);
    try {
      const { url } = await obterUrlXmlNotaFiscal(empresaId, id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível baixar o XML');
    } finally {
      setBaixandoXmlId(null);
    }
  }

  function abrirDetalhe(id: string) {
    if (!empresaId) return;
    setDetalheId(id);
    setCarregandoDetalhe(true);
    obterDetalheNotaFiscal(empresaId, id)
      .then(setDetalhe)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregandoDetalhe(false));
  }

  async function abrirXml() {
    if (!empresaId || !detalheId) return;
    try {
      const { url } = await obterUrlXmlNotaFiscal(empresaId, detalheId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível abrir o XML');
    }
  }

  async function aprovar(id: string) {
    if (!empresaId) return;
    setAprovandoId(id);
    try {
      await aprovarNotaFiscal(empresaId, id);
      showSuccess('Nota aprovada -- lançamento gerado.');
      setDetalheId(null);
      setVersaoPainel((v) => v + 1);
      carregar();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível aprovar a nota');
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
      await rejeitarNotaFiscal(empresaId, dialogRejeitar.id, motivoRejeicao.trim());
      showSuccess('Nota rejeitada.');
      setDialogRejeitar(null);
      setDetalheId(null);
      setVersaoPainel((v) => v + 1);
      carregar();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível rejeitar a nota');
    } finally {
      setRejeitando(false);
    }
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <ReceiptText className="mr-2 h-6 w-6" /> Notas Fiscais
        </h1>
      </div>

      <PainelNotasFiscais empresaId={empresaId} onSelecionarFiltro={selecionarFiltro} chaveRecarga={versaoPainel} />

      <Card className="mb-6">
        <CardContent className="space-y-3 p-4">
          <Button type="button" variant="link" className="h-auto p-0" onClick={() => setConfigAberta((a) => !a)}>
            {configAberta ? 'Ocultar' : 'Configurar'} agente e contas do lançamento automático
          </Button>
          {configAberta && (
            <div className="space-y-6 rounded-md border p-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Agente local</h3>
                <SecaoAgenteNotasFiscais empresaId={empresaId} />
              </div>
              <div className="border-t pt-4">
                <h3 className="mb-2 text-sm font-semibold">Contas do lançamento automático</h3>
                <SecaoLancamentosNotasFiscais empresaId={empresaId} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div ref={tabelaRef} className="mb-3 flex flex-wrap gap-2">
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
                    <TableHead>Nº/Série</TableHead>
                    <TableHead>Contraparte</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhuma nota fiscal {filtroStatus === 'capturada' ? 'pendente de revisão' : 'neste filtro'}. O agente local sincroniza
                        automaticamente conforme novos XML chegam.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <BadgeDirecao direcao={item.direcao} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.numero}/{item.serie}
                        </TableCell>
                        <TableCell className="text-sm">{item.direcao === 'entrada' ? item.emitenteNome : item.destinatarioNome ?? 'Consumidor final'}</TableCell>
                        <TableCell className="text-sm">{formatarData(item.dataEmissao)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatarMoeda(item.valorTotal)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <BadgeStatus status={item.status} />
                            {item.cStat !== C_STAT_AUTORIZADA && (
                              <Badge variant="destructive" title="cStat diferente de 100 -- revise antes de decidir">
                                cStat {item.cStat}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={baixandoXmlId === item.id}
                              title="Baixar XML original"
                              onClick={() => baixarXml(item.id)}
                            >
                              {baixandoXmlId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
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
            <DialogTitle>
              {detalhe ? `${detalhe.modelo === '65' ? 'NFCe' : 'NFe'} nº${detalhe.numero}/${detalhe.serie}` : 'Carregando...'}
            </DialogTitle>
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
                  <Label className="text-xs text-muted-foreground">Emissão</Label>
                  <p>{formatarData(detalhe.dataEmissao)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor total</Label>
                  <p className="font-mono">{formatarMoeda(detalhe.valorTotal)}</p>
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

              {detalhe.cStat !== C_STAT_AUTORIZADA && (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
                  cStat {detalhe.cStat} -- esta nota não está autorizada (100). Nenhum fornecedor/cliente foi cadastrado automaticamente.
                  Revise com cuidado antes de aprovar.
                </p>
              )}

              <div className="max-h-[45vh] overflow-x-auto overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>NCM</TableHead>
                      <TableHead>CEST</TableHead>
                      <TableHead>CFOP</TableHead>
                      <TableHead>CST/CSOSN</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Vlr. item</TableHead>
                      <TableHead className="text-right">ICMS</TableHead>
                      <TableHead className="text-right">ICMS-ST</TableHead>
                      <TableHead className="text-right">PIS</TableHead>
                      <TableHead className="text-right">COFINS</TableHead>
                      <TableHead className="text-right">CBS</TableHead>
                      <TableHead className="text-right">IBS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalhe.itens.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.descricao}</TableCell>
                        <TableCell className="font-mono text-xs">{item.ncm ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{item.cest ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{item.cfop}</TableCell>
                        <TableCell className="font-mono text-xs">{item.cstCsosn ?? '—'}</TableCell>
                        <TableCell className="text-right text-sm">{item.quantidade}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatarMoeda(item.valorTotal)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatarMoeda(item.valorIcms)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatarMoeda(item.valorIcmsSt)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatarMoeda(item.valorPis)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatarMoeda(item.valorCofins)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatarMoeda(item.valorCbs)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatarMoeda(item.valorIbs)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {detalhe.pagamentos?.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Pagamento</Label>
                  <ul className="mt-1 space-y-1 text-sm">
                    {detalhe.pagamentos.map((pagamento: any) => (
                      <li key={pagamento.id} className="flex justify-between rounded-md border px-3 py-1.5">
                        <span>
                          {rotuloFormaPagamento(pagamento.formaPagamento)}
                          {pagamento.indicadorPagamento === '0' && ' -- à vista'}
                          {pagamento.indicadorPagamento === '1' && ' -- a prazo'}
                        </span>
                        <span className="font-mono">{formatarMoeda(pagamento.valor)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detalhe.parcelas.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Duplicatas</Label>
                  <ul className="mt-1 space-y-1 text-sm">
                    {detalhe.parcelas.map((parcela: any) => (
                      <li key={parcela.id} className="flex justify-between rounded-md border px-3 py-1.5">
                        <span>Parcela {parcela.numeroDuplicata} -- vence {formatarData(parcela.dataVencimento)}</span>
                        <span className="font-mono">{formatarMoeda(parcela.valor)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <Button variant="outline" size="sm" onClick={abrirXml}>
                  <ArrowDown className="mr-1 h-3.5 w-3.5" /> Ver XML original
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
            <DialogTitle>Rejeitar nota fiscal</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-rejeicao">Motivo</Label>
            <Textarea id="motivo-rejeicao" value={motivoRejeicao} onChange={(e) => setMotivoRejeicao(e.target.value)} maxLength={500} rows={3} />
          </div>
          <Button onClick={rejeitar} disabled={!motivoRejeicao.trim() || rejeitando} className="w-full">
            {rejeitando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar rejeição'}
          </Button>
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
