import { useEffect, useState } from 'react';
import { Coins, Landmark, Loader2, ReceiptText, RefreshCw } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import {
  baixarDas,
  estimarSincronizacaoDas,
  gerarProvisaoDas,
  gerarSegundaViaDas,
  listarDas,
  listarPendenciasBaixaDas,
  obterConfiguracaoLancamentosDas,
  obterUrlPdfDas,
  sincronizarDas,
} from '../servicos/das';
import { listarBancos } from '../servicos/bancos';
import { executarComAvisoDeCredito } from '../servicos/creditos';
import { showError, showSuccess } from '../utils/toast';
import SecaoLancamentosDas from '../components/empresas/SecaoLancamentosDas';

/** AAAA-MM (valor de <input type="month">) do mês atual menos `offsetMeses`. */
function mesInput(offsetMeses: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offsetMeses);
  return d.toISOString().slice(0, 7);
}

// null = SERPRO não devolveu valor estruturado nesta sincronização (ver comentário do backend em sincronizar-das-empresa.usecase.ts) -- mostra "—" em vez de fabricar R$ 0,00.
const formatarMoeda = (valor: number | null) =>
  valor === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
const formatarCompetencia = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '—';
const formatarData = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

/** Amanhã no formato AAAA-MM-DD -- mínimo aceito pelo SERPRO (data estritamente futura). */
function amanhaIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Sugestão padrão pro "até quando o boleto fica válido pra pagar" -- +5 dias, NÃO fim do
 * mês. Confirmado contra produção em 2026-10-21: o SERPRO só tem a Taxa Selic publicada
 * poucos dias no futuro (nesse teste, até +9 dias; +10 já rejeitou com "Taxa Selic não
 * cadastrada") -- esse limite é do SERPRO e varia dia a dia, não é algo que o app possa
 * prever com certeza. Por isso a margem de segurança curta, e o campo continua editável.
 */
function dataSugeridaIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
}

const ROTULO_STATUS: Record<string, { texto: string; variante: 'success' | 'warning' | 'destructive' }> = {
  pago: { texto: 'Pago', variante: 'success' },
  pendente: { texto: 'A vencer', variante: 'warning' },
  vencido: { texto: 'Vencido', variante: 'destructive' },
};

export default function Das() {
  const { empresaId, ehContador, ehPlataforma } = useEmpresaAtiva();
  // Custo em crédito só é mostrado pro contador/plataforma -- pro empresário é "operações
  // fiscais incluídas no plano" (docs/UX-UI.md), nunca granular por operação.
  const podeVerCredito = ehContador || ehPlataforma;
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagemCredito, setMensagemCredito] = useState<string | null>(null);
  const [competenciaInicio, setCompetenciaInicio] = useState(mesInput(2));
  const [competenciaFim, setCompetenciaFim] = useState(mesInput(0));
  const [estimando, setEstimando] = useState(false);
  const [estimativa, setEstimativa] = useState<any>(null);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [gerandoSegundaViaId, setGerandoSegundaViaId] = useState<string | null>(null);
  const [dialogSegundaVia, setDialogSegundaVia] = useState<{ dasId: string; competencia: string } | null>(null);
  const [dataConsolidacao, setDataConsolidacao] = useState('');
  // Guarda de regime vem do próprio backend (400 se a empresa não for MEI/Simples
  // Nacional) -- evita uma chamada extra só pra checar `regimeTributario` antes.
  const [naoAplicavel, setNaoAplicavel] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [pendenciasBaixa, setPendenciasBaixa] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [dialogBaixa, setDialogBaixa] = useState<{ dasId: string; competencia: string } | null>(null);
  const [tipoBaixa, setTipoBaixa] = useState<'caixa' | 'banco'>('banco');
  const [bancoBaixaId, setBancoBaixaId] = useState('');
  const [resolvendoBaixa, setResolvendoBaixa] = useState(false);
  const [configLancamentos, setConfigLancamentos] = useState<any>(null);
  const [selecionadosProvisao, setSelecionadosProvisao] = useState<Set<string>>(new Set());
  const [gerandoProvisaoId, setGerandoProvisaoId] = useState<string | null>(null);
  const [gerandoEmLote, setGerandoEmLote] = useState(false);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    setNaoAplicavel(false);
    listarDas(empresaId)
      .then(setItens)
      .catch((erro) => {
        if (erro.status === 400) setNaoAplicavel(true);
        else showError(erro.message);
      })
      .finally(() => setCarregando(false));
    listarPendenciasBaixaDas(empresaId).then(setPendenciasBaixa).catch(() => setPendenciasBaixa([]));
    listarBancos(empresaId, true).then(setBancos).catch(() => setBancos([]));
    obterConfiguracaoLancamentosDas(empresaId).then(setConfigLancamentos).catch(() => setConfigLancamentos(null));
  }
  useEffect(carregar, [empresaId]);

  // Vencido/a vencer sem lançamento de provisão ainda -- normalmente porque a config não
  // existia na hora do sync (nunca bloqueia o sync, só avisa aqui).
  const itensSemProvisao = itens.filter((item) => item.statusApresentacao !== 'pago' && !item.contaPagarProvisaoId);

  function alternarSelecaoProvisao(id: string) {
    setSelecionadosProvisao((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarSelecionarTodos() {
    setSelecionadosProvisao((prev) =>
      prev.size === itensSemProvisao.length ? new Set() : new Set(itensSemProvisao.map((i) => i.id)),
    );
  }

  async function gerarProvisaoUnica(dasId: string) {
    if (!empresaId) return;
    setGerandoProvisaoId(dasId);
    try {
      await gerarProvisaoDas(empresaId, dasId);
      showSuccess('Conta a pagar gerada.');
      carregar();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível gerar a conta a pagar');
    } finally {
      setGerandoProvisaoId(null);
    }
  }

  async function gerarProvisaoEmLote() {
    if (!empresaId || selecionadosProvisao.size === 0) return;
    setGerandoEmLote(true);
    let sucesso = 0;
    let falha = 0;
    for (const dasId of selecionadosProvisao) {
      try {
        await gerarProvisaoDas(empresaId, dasId);
        sucesso++;
      } catch {
        falha++;
      }
    }
    setGerandoEmLote(false);
    setSelecionadosProvisao(new Set());
    showSuccess(falha > 0 ? `${sucesso} conta(s) a pagar gerada(s), ${falha} falharam.` : `${sucesso} conta(s) a pagar gerada(s).`);
    carregar();
  }

  const bancosDoTipo = bancos.filter((b: any) => b.tipo === tipoBaixa);

  function abrirDialogBaixa(item: any) {
    setDialogBaixa({ dasId: item.id, competencia: item.competencia });
    setTipoBaixa('banco');
    setBancoBaixaId('');
  }

  async function resolverBaixa() {
    if (!empresaId || !dialogBaixa || !bancoBaixaId) return;
    setResolvendoBaixa(true);
    try {
      await baixarDas(empresaId, dialogBaixa.dasId, { tipo: tipoBaixa, bancoId: bancoBaixaId });
      showSuccess('Baixa do DAS registrada.');
      setDialogBaixa(null);
      carregar();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível registrar a baixa');
    } finally {
      setResolvendoBaixa(false);
    }
  }

  /** Intervalo escolhido, convertido pra AAAA-MM-01 (dia fixo -- competência sempre é 1º do mês). */
  function filtroAtual() {
    return { competenciaInicio: `${competenciaInicio}-01`, competenciaFim: `${competenciaFim}-01` };
  }

  function verCustoEstimado() {
    if (!empresaId) return;
    setEstimando(true);
    setEstimativa(null);
    estimarSincronizacaoDas(empresaId, filtroAtual())
      .then(setEstimativa)
      .catch((erro) => showError(erro.message))
      .finally(() => setEstimando(false));
  }

  async function sincronizar() {
    if (!empresaId) return;
    setSincronizando(true);
    setMensagemCredito(null);
    try {
      const { gasto, saldo } = await executarComAvisoDeCredito(empresaId, () => sincronizarDas(empresaId, filtroAtual()));
      setEstimativa(null);
      carregar();
      if (podeVerCredito) {
        setMensagemCredito(gasto > 0 ? `Sincronização gastou ${gasto} crédito(s). Saldo atual: ${saldo}.` : `Sincronização não gastou crédito. Saldo atual: ${saldo}.`);
      }
    } catch (erro: any) {
      showError(erro.message);
    } finally {
      setSincronizando(false);
    }
  }

  async function baixar(dasId: string) {
    if (!empresaId) return;
    setBaixandoId(dasId);
    try {
      const { url } = await obterUrlPdfDas(empresaId, dasId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível abrir o PDF do DAS');
    } finally {
      setBaixandoId(null);
    }
  }

  /** Abre o diálogo pra escolher até quando o boleto fica válido pra pagar -- default fim do mês, pra não precisar reemitir toda hora um DAS vencido. */
  function abrirDialogSegundaVia(item: any) {
    setDialogSegundaVia({ dasId: item.id, competencia: item.competencia });
    setDataConsolidacao(dataSugeridaIso());
  }

  /**
   * Boleto real (código de barras) -- sempre gera de novo no SERPRO, por isso tem o próprio loading separado do "Relatório".
   * Abre a aba ANTES do await -- `window.open` depois de uma espera assíncrona perde a
   * associação com o clique do usuário e o Chrome bloqueia o popup sem avisar nada.
   * NUNCA passar "noopener" nesta chamada inicial -- por spec, `window.open` com noopener
   * sempre devolve null, e sem a referência não tem como navegar a aba depois (bug real:
   * abria about:blank e nunca saía disso). `aba.opener = null` depois consegue o mesmo
   * efeito de segurança (a página aberta não acessa o opener) sem perder a referência local.
   */
  async function gerarSegundaVia() {
    if (!empresaId || !dialogSegundaVia) return;
    const { dasId } = dialogSegundaVia;
    const aba = window.open('', '_blank');
    if (aba) aba.opener = null;
    setGerandoSegundaViaId(dasId);
    try {
      const { resultado, gasto, saldo } = await executarComAvisoDeCredito(empresaId, () =>
        gerarSegundaViaDas(empresaId, dasId, dataConsolidacao),
      );
      if (aba) aba.location.href = resultado.url;
      else window.open(resultado.url, '_blank', 'noopener,noreferrer');
      setDialogSegundaVia(null);
      carregar();
      if (podeVerCredito) {
        setMensagemCredito(gasto > 0 ? `2ª via gastou ${gasto} crédito(s). Saldo atual: ${saldo}.` : `2ª via não gastou crédito. Saldo atual: ${saldo}.`);
      }
    } catch (erro: any) {
      aba?.close();
      showError(erro.message ?? 'Não foi possível gerar a 2ª via do DAS');
    } finally {
      setGerandoSegundaViaId(null);
    }
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <ReceiptText className="mr-2 h-6 w-6" /> DAS
        </h1>
      </div>

      {!naoAplicavel && (
        <Card className="mb-6">
          <CardContent className="space-y-3 p-4">
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => setConfigAberta((a) => !a)}>
              {configAberta ? 'Ocultar' : 'Configurar'} contas do lançamento automático
            </Button>
            {configAberta && (
              <div className="rounded-md border p-4">
                <SecaoLancamentosDas empresaId={empresaId} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!naoAplicavel && (
        <Card className="mb-6">
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <Label htmlFor="competencia-inicio">Competência início</Label>
                <Input
                  id="competencia-inicio"
                  type="month"
                  max={mesInput(0)}
                  value={competenciaInicio}
                  onChange={(e) => {
                    setCompetenciaInicio(e.target.value);
                    setEstimativa(null);
                  }}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="competencia-fim">Competência fim</Label>
                <Input
                  id="competencia-fim"
                  type="month"
                  max={mesInput(0)}
                  value={competenciaFim}
                  onChange={(e) => {
                    setCompetenciaFim(e.target.value);
                    setEstimativa(null);
                  }}
                />
              </div>
              <Button variant="outline" onClick={verCustoEstimado} disabled={estimando} className="sm:w-auto">
                {estimando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coins className="mr-2 h-4 w-4" />}
                Ver custo estimado
              </Button>
            </div>

            {estimativa && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">
                  Essa sincronização vai gastar <span className="font-bold">{estimativa.creditosNecessarios}</span> crédito(s)
                  {estimativa.detalhamento.some((d: any) => d.aproximado) && ' (número máximo -- pode custar menos)'}.
                </p>
                <p className="text-muted-foreground">Saldo atual: {estimativa.saldoAtual} crédito(s).</p>
                {!estimativa.saldoSuficiente && (
                  <p className="font-medium text-destructive">Saldo insuficiente pra essa sincronização.</p>
                )}
              </div>
            )}

            <Button
              onClick={sincronizar}
              disabled={sincronizando || (estimativa && !estimativa.saldoSuficiente)}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
              {estimativa ? `Sincronizar (${estimativa.creditosNecessarios} crédito(s))` : 'Sincronizar agora'}
            </Button>
            {mensagemCredito && <p className="text-sm font-medium text-muted-foreground">{mensagemCredito}</p>}
          </CardContent>
        </Card>
      )}

      {itensSemProvisao.length > 0 && (
        <Card className="mb-6 border-amber-300">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium text-amber-800">
              {itensSemProvisao.length} DAS sem conta a pagar de provisão
              {!configLancamentos && ' -- configure as contas do lançamento automático antes de gerar'}.
            </p>
            {configLancamentos && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selecionadosProvisao.size === itensSemProvisao.length}
                    onCheckedChange={alternarSelecionarTodos}
                  />
                  <Label className="text-sm font-normal">Selecionar todos</Label>
                </div>
                <Button size="sm" disabled={selecionadosProvisao.size === 0 || gerandoEmLote} onClick={gerarProvisaoEmLote}>
                  {gerandoEmLote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Gerar contas a pagar selecionadas ({selecionadosProvisao.size})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {pendenciasBaixa.length > 0 && (
        <Card className="mb-6 border-amber-300">
          <CardContent className="space-y-3 p-4">
            <p className="flex items-center text-sm font-medium text-amber-800">
              <Landmark className="mr-2 h-4 w-4" /> {pendenciasBaixa.length} DAS pago(s) aguardando baixa contábil
            </p>
            {pendenciasBaixa.map((item: any) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-md border bg-amber-50/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <span className="font-medium">{formatarCompetencia(item.competencia)}</span> -- {formatarMoeda(item.valor)}
                </div>
                <Button size="sm" variant="outline" onClick={() => abrirDialogBaixa(item)}>
                  Dar baixa
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {naoAplicavel ? (
            <div className="flex h-24 items-center justify-center text-center text-sm text-muted-foreground">
              Este módulo é aplicável apenas a empresas MEI ou Simples Nacional ME/EPP.
            </div>
          ) : carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum DAS sincronizado ainda. Clique em "Sincronizar agora".
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{formatarCompetencia(item.competencia)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatarMoeda(item.valor)}</TableCell>
                        <TableCell className="text-sm">{formatarData(item.vencimento)}</TableCell>
                        <TableCell>
                          <Badge variant={ROTULO_STATUS[item.statusApresentacao].variante}>
                            {ROTULO_STATUS[item.statusApresentacao].texto}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.statusApresentacao !== 'pago' && !item.contaPagarProvisaoId && (
                              <>
                                {configLancamentos && (
                                  <Checkbox
                                    checked={selecionadosProvisao.has(item.id)}
                                    onCheckedChange={() => alternarSelecaoProvisao(item.id)}
                                  />
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!configLancamentos || gerandoProvisaoId === item.id}
                                  title={!configLancamentos ? 'Configure as contas do lançamento automático antes' : undefined}
                                  onClick={() => gerarProvisaoUnica(item.id)}
                                >
                                  {gerandoProvisaoId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar conta a pagar'}
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm" disabled={baixandoId === item.id} onClick={() => baixar(item.id)}>
                              {baixandoId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Relatório'}
                            </Button>
                            {item.regime === 'simples_nacional' && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={gerandoSegundaViaId === item.id}
                                onClick={() => abrirDialogSegundaVia(item)}
                                title="Gera o boleto real (código de barras) com o valor atualizado -- inclui juros/multa se estiver vencido"
                              >
                                {gerandoSegundaViaId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : '2ª via'}
                              </Button>
                            )}
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

      <Dialog open={!!dialogSegundaVia} onOpenChange={(aberto) => !aberto && setDialogSegundaVia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar 2ª via -- {dialogSegundaVia ? formatarCompetencia(dialogSegundaVia.competencia) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="data-consolidacao">Válido para pagar até</Label>
            <Input
              id="data-consolidacao"
              type="date"
              min={amanhaIso()}
              value={dataConsolidacao}
              onChange={(e) => setDataConsolidacao(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              O boleto é gerado de novo com o valor atualizado (juros/multa se vencido). O SERPRO só aceita datas próximas --
              se escolher algo muito à frente (ex: fim do mês), pode recusar com "Taxa Selic não cadastrada"; nesse caso,
              escolha uma data mais próxima.
            </p>
          </div>
          <Button onClick={gerarSegundaVia} disabled={!dataConsolidacao || gerandoSegundaViaId === dialogSegundaVia?.dasId} className="w-full">
            {gerandoSegundaViaId === dialogSegundaVia?.dasId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar 2ª via'}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dialogBaixa} onOpenChange={(aberto) => !aberto && setDialogBaixa(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar baixa -- {dialogBaixa ? formatarCompetencia(dialogBaixa.competencia) : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Pago via</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipoBaixa === 'banco' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setTipoBaixa('banco');
                    setBancoBaixaId('');
                  }}
                >
                  Banco
                </Button>
                <Button
                  type="button"
                  variant={tipoBaixa === 'caixa' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setTipoBaixa('caixa');
                    setBancoBaixaId('');
                  }}
                >
                  Caixa
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{tipoBaixa === 'banco' ? 'Qual banco' : 'Qual caixa'}</Label>
              <select
                value={bancoBaixaId}
                onChange={(e) => setBancoBaixaId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Selecione...</option>
                {bancosDoTipo.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
              {bancosDoTipo.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum {tipoBaixa} cadastrado -- cadastre em Bancos antes de dar baixa.</p>
              )}
            </div>
            {tipoBaixa === 'banco' && (
              <p className="text-xs text-muted-foreground">
                Este lançamento fica marcado "pendente de conciliação" até ser casado com o extrato real.
              </p>
            )}
          </div>
          <Button onClick={resolverBaixa} disabled={!bancoBaixaId || resolvendoBaixa} className="w-full">
            {resolvendoBaixa ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar baixa'}
          </Button>
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
