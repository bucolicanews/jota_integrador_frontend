import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink, Loader2, Scale, Send } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarApuracaoTributaria } from '../servicos/notasFiscais';
import { transmitirDeclaracaoPgdasd } from '../servicos/das';
import { obterEmpresa } from '../servicos/empresas';
import {
  calcularApuracaoSimples,
  calcularFatorR,
  calcularRbt12,
  definirReceitaMensal,
  listarCatalogoAtividadesServico,
} from '../servicos/apuracaoSimples';
import { showError, showSuccess } from '../utils/toast';

const ROTULO_ORIGEM: Record<string, string> = {
  notas_fiscais: 'nota fiscal',
  manual: 'manual',
  ausente: 'faltando',
};

const ROTULO_CATEGORIA_TRIBUTACAO: Record<string, string> = {
  normal: 'Normal',
  icms_ja_recolhido: 'ICMS-ST/monofásico',
  pis_cofins_ja_recolhido: 'PIS/COFINS-ST/monofásico',
  ambos_ja_recolhidos: 'Ambos já recolhidos',
};

type VarianteBadge = 'default' | 'outline' | 'destructive' | 'secondary' | 'success' | 'warning' | 'info';

const VARIANTE_CATEGORIA_TRIBUTACAO: Record<string, VarianteBadge> = {
  normal: 'secondary',
  icms_ja_recolhido: 'warning',
  pis_cofins_ja_recolhido: 'warning',
  ambos_ja_recolhidos: 'destructive',
};

const URL_PORTAL_SIMPLES_NACIONAL = 'https://www8.receita.fazenda.gov.br/SimplesNacional/';

/** AAAA-MM (valor de <input type="month">) do mês atual menos `offsetMeses`. */
function mesInput(offsetMeses: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offsetMeses);
  return d.toISOString().slice(0, 7);
}

const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const formatarData = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const formatarCompetencia = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '—');

function somar(itens: any[], campo: string): number {
  return itens.reduce((acc, i) => acc + (i[campo] ?? 0), 0);
}

/** Último dia do mês de uma competência 'AAAA-MM-01' (mesma regra do backend, ultimoDiaDoMes em receita-mensal.ts). */
function ultimoDiaDoMes(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number);
  return new Date(ano, mes, 0).toISOString().slice(0, 10);
}

/** Agrupa itens de saída aprovada por CFOP -- mesma lógica de `porCfop`, reaproveitada pro detalhamento de um mês específico do RBT12. */
function agruparPorCfop(itens: any[]): { cfop: string; valorTotal: number; categorias: Set<string> }[] {
  const mapa = new Map<string, { cfop: string; valorTotal: number; categorias: Set<string> }>();
  for (const item of itens) {
    if (item.direcao !== 'saida' || item.statusNota !== 'aprovada') continue;
    if (!mapa.has(item.cfop)) mapa.set(item.cfop, { cfop: item.cfop, valorTotal: 0, categorias: new Set() });
    const linha = mapa.get(item.cfop)!;
    linha.valorTotal += item.valorTotal;
    linha.categorias.add(item.categoriaTributacao);
  }
  return Array.from(mapa.values()).sort((a, b) => a.cfop.localeCompare(b.cfop));
}

/** Detalhamento por CFOP de um mês do RBT12 -- comércio vem das notas (quebra por CFOP); serviço é sempre lançamento manual, sem CFOP pra quebrar. */
function DetalheMesRbt12({ mes, itens, carregando }: { mes: any; itens: any[] | undefined; carregando: boolean }) {
  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando notas do mês...
      </div>
    );
  }
  const porCfopDoMes = mes.origemComercioIndustria === 'notas_fiscais' ? agruparPorCfop(itens ?? []) : [];
  return (
    <div className="space-y-3 py-2">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Comércio/Indústria por CFOP</p>
        {mes.origemComercioIndustria !== 'notas_fiscais' ? (
          <p className="text-sm text-muted-foreground">Sem nota fiscal nesse mês -- valor {formatarMoeda(mes.comercioIndustria)} é lançamento manual, sem CFOP pra detalhar.</p>
        ) : porCfopDoMes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma nota de saída aprovada encontrada pra este mês.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CFOP</TableHead>
                  <TableHead>Tributação</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porCfopDoMes.map((linha) => (
                  <TableRow key={linha.cfop}>
                    <TableCell className="font-mono text-sm">{linha.cfop}</TableCell>
                    <TableCell>
                      {linha.categorias.size > 1 ? (
                        <Badge variant="destructive">Misto</Badge>
                      ) : (
                        <Badge variant={VARIANTE_CATEGORIA_TRIBUTACAO[[...linha.categorias][0]]}>{ROTULO_CATEGORIA_TRIBUTACAO[[...linha.categorias][0]]}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatarMoeda(linha.valorTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Serviço</p>
        <p className="text-sm text-muted-foreground">
          {mes.servico > 0
            ? `${formatarMoeda(mes.servico)} -- lançamento manual, sem CFOP (sistema não captura NFS-e).`
            : 'Sem receita de serviço lançada neste mês.'}
        </p>
      </div>
    </div>
  );
}

/** Baldes de receita segregados por tributação (Fase 4.5 -- partilha) -- só mostra linhas com receita, "normal" sempre aparece. */
function TabelaBaldes({ baldes }: { baldes: any[] }) {
  const relevantes = baldes.filter((b) => b.receita > 0 || b.tipo === 'normal');
  if (relevantes.length === 0) return null;
  return (
    <div className="mt-2 space-y-1 border-t pt-2">
      {relevantes.map((balde) => (
        <div key={balde.tipo} className="flex items-center justify-between gap-2 text-xs">
          <Badge variant={VARIANTE_CATEGORIA_TRIBUTACAO[balde.tipo]} className="shrink-0">
            {ROTULO_CATEGORIA_TRIBUTACAO[balde.tipo]}
          </Badge>
          <span className="text-muted-foreground">{formatarMoeda(balde.receita)}</span>
          <span className="text-muted-foreground">× {(balde.aliquotaAplicada * 100).toFixed(4)}%</span>
          <span className="font-mono font-medium">{formatarMoeda(balde.das)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ApuracaoTributaria() {
  const { empresaId } = useEmpresaAtiva();
  const [competenciaInicio, setCompetenciaInicio] = useState(mesInput(0));
  const [competenciaFim, setCompetenciaFim] = useState(mesInput(0));
  const [itens, setItens] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [filtroCfop, setFiltroCfop] = useState('');
  const [dialogEnvioAberto, setDialogEnvioAberto] = useState(false);

  // Apuração oficial (RBT12/Fator R/Anexo/alíquota efetiva) -- sempre referente ao mês de
  // "Competência fim" (apuração do Simples é mensal, não por intervalo).
  const [rbt12, setRbt12] = useState<any>(null);
  const [fatorR, setFatorR] = useState<any>(null);
  const [apuracaoSimples, setApuracaoSimples] = useState<any>(null);
  const [precisaAtividadeServico, setPrecisaAtividadeServico] = useState(false);
  const [catalogoAtividades, setCatalogoAtividades] = useState<any[]>([]);
  const [chaveAtividadeServico, setChaveAtividadeServico] = useState('');
  const [salvandoReceita, setSalvandoReceita] = useState<string | null>(null);
  const [mesExpandido, setMesExpandido] = useState<string | null>(null);
  const [itensPorMes, setItensPorMes] = useState<Record<string, any[]>>({});
  const [carregandoMes, setCarregandoMes] = useState<string | null>(null);
  const [mesTransmitindo, setMesTransmitindo] = useState<any | null>(null);
  const [confirmacaoCompetencia, setConfirmacaoCompetencia] = useState('');
  const [transmitindo, setTransmitindo] = useState(false);
  const [resultadoTransmissao, setResultadoTransmissao] = useState<any | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    listarCatalogoAtividadesServico(empresaId).then(setCatalogoAtividades).catch(() => setCatalogoAtividades([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  function carregarApuracaoOficial(chaveAtividade?: string) {
    if (!empresaId) return;
    const competenciaReferencia = `${competenciaFim}-01`;
    calcularRbt12(empresaId, competenciaReferencia).then(setRbt12).catch((erro) => showError(erro.message));
    calcularFatorR(empresaId, competenciaReferencia).then(setFatorR).catch((erro) => showError(erro.message));
    calcularApuracaoSimples(empresaId, competenciaReferencia, chaveAtividade)
      .then((resultado) => {
        setApuracaoSimples(resultado);
        setPrecisaAtividadeServico(false);
      })
      .catch((erro) => {
        if (erro.message?.includes('atividade de serviço')) {
          setPrecisaAtividadeServico(true);
          setApuracaoSimples(null);
        } else {
          showError(erro.message);
        }
      });
  }

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    const dataInicio = `${competenciaInicio}-01`;
    const dataFimMes = new Date(`${competenciaFim}-01T00:00:00`);
    dataFimMes.setMonth(dataFimMes.getMonth() + 1);
    dataFimMes.setDate(0); // último dia do mês de competenciaFim
    const dataFim = dataFimMes.toISOString().slice(0, 10);

    Promise.all([listarApuracaoTributaria(empresaId, dataInicio, dataFim), obterEmpresa(empresaId)])
      .then(([listaItens, dadosEmpresa]) => {
        setItens(listaItens);
        setEmpresa(dadosEmpresa);
        carregarApuracaoOficial(chaveAtividadeServico || undefined);
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  function aoEscolherAtividadeServico(chave: string) {
    setChaveAtividadeServico(chave);
    carregarApuracaoOficial(chave);
  }

  async function salvarReceitaManual(competencia: string, tipoAtividade: 'comercio_industria' | 'servico', valor: number) {
    if (!empresaId) return;
    setSalvandoReceita(`${competencia}:${tipoAtividade}`);
    try {
      await definirReceitaMensal(empresaId, { competencia, tipoAtividade, valor });
      showSuccess('Receita mensal salva.');
      carregarApuracaoOficial(chaveAtividadeServico || undefined);
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível salvar');
    } finally {
      setSalvandoReceita(null);
    }
  }

  function alternarMesExpandido(mes: any) {
    if (mesExpandido === mes.competencia) {
      setMesExpandido(null);
      return;
    }
    setMesExpandido(mes.competencia);
    if (!empresaId || itensPorMes[mes.competencia] || mes.origemComercioIndustria !== 'notas_fiscais') return;
    setCarregandoMes(mes.competencia);
    listarApuracaoTributaria(empresaId, mes.competencia, ultimoDiaDoMes(mes.competencia))
      .then((lista: any[]) => setItensPorMes((prev) => ({ ...prev, [mes.competencia]: lista })))
      .catch((erro: any) => showError(erro.message))
      .finally(() => setCarregandoMes(null));
  }

  function abrirDialogTransmissao(mes: any) {
    setMesTransmitindo(mes);
    setConfirmacaoCompetencia('');
    setResultadoTransmissao(null);
  }

  async function confirmarTransmissao() {
    if (!empresaId || !mesTransmitindo) return;
    setTransmitindo(true);
    try {
      const resultado = await transmitirDeclaracaoPgdasd(empresaId, mesTransmitindo.competencia, {
        chaveAtividadeServico: chaveAtividadeServico || undefined,
      });
      setResultadoTransmissao(resultado);
      if (resultado.transmitido) showSuccess('Declaração transmitida pro SERPRO.');
      carregarApuracaoOficial(chaveAtividadeServico || undefined);
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível transmitir a declaração');
    } finally {
      setTransmitindo(false);
    }
  }

  const entrada = useMemo(() => itens.filter((i) => i.direcao === 'entrada'), [itens]);
  const saida = useMemo(() => itens.filter((i) => i.direcao === 'saida'), [itens]);

  const ehHibrido = empresa?.apuracaoIbsCbsHibrida === true && empresa?.regimeTributario === 'simples_nacional';

  const debitoCbs = somar(saida, 'valorCbs');
  const debitoIbs = somar(saida, 'valorIbs');
  const creditoCbs = somar(entrada, 'valorCbs');
  const creditoIbs = somar(entrada, 'valorIbs');

  // Receita bruta do período = soma dos produtos nas notas de SAÍDA (vendas) -- é a base
  // que o PGDAS-D pede, mas aqui é só o que foi capturado via XML neste sistema, sem RBT12
  // (histórico de 12 meses) nem segregação por anexo/Fator R -- por isso nunca é usado pra
  // transmitir nada automaticamente, só pra conferência do contador.
  const receitaBrutaPeriodo = somar(saida, 'valorTotal');

  function montarResumoTexto(): string {
    const linhas = [
      `Apuração Simples Nacional -- competência ${competenciaFim}`,
      `Empresa: ${empresa?.razaoSocial ?? ''} (${empresa?.cnpj ?? ''})`,
      '',
    ];

    const linhasBaldes = (segregacao: any) =>
      segregacao.baldes
        .filter((b: any) => b.receita > 0 || b.tipo === 'normal')
        .map(
          (b: any) =>
            `  - ${ROTULO_CATEGORIA_TRIBUTACAO[b.tipo]}: ${formatarMoeda(b.receita)} × ${(b.aliquotaAplicada * 100).toFixed(4)}% = ${formatarMoeda(b.das)}`,
        );

    if (apuracaoSimples) {
      linhas.push(
        `RBT12 comércio/indústria: ${formatarMoeda(apuracaoSimples.rbt12.totalComercioIndustria)} (Anexo ${apuracaoSimples.comercioIndustria.anexo})`,
        `Receita do mês (comércio/indústria): ${formatarMoeda(apuracaoSimples.comercioIndustria.receitaDoMes)}`,
        `Alíquota efetiva: ${(apuracaoSimples.comercioIndustria.aliquotaEfetiva * 100).toFixed(4)}%`,
        'Partilha (receita segregada por tributação já recolhida):',
        ...linhasBaldes(apuracaoSimples.comercioIndustria),
        `DAS devido (comércio/indústria): ${formatarMoeda(apuracaoSimples.comercioIndustria.dasDevido)}`,
      );
      if (apuracaoSimples.servico) {
        linhas.push(
          '',
          `RBT12 serviço: ${formatarMoeda(apuracaoSimples.rbt12.totalServico)} (Anexo ${apuracaoSimples.servico.anexo})`,
          `Receita do mês (serviço): ${formatarMoeda(apuracaoSimples.servico.receitaDoMes)}`,
          `Alíquota efetiva: ${(apuracaoSimples.servico.aliquotaEfetiva * 100).toFixed(4)}%`,
          '(receita de serviço é sempre lançamento manual, sem CST pra segregar -- fica 100% no balde normal)',
          `DAS devido (serviço): ${formatarMoeda(apuracaoSimples.servico.dasDevido)}`,
        );
      }
      if (fatorR?.temContaConfigurada) {
        linhas.push('', `Fator R: ${((fatorR.fatorR ?? 0) * 100).toFixed(2)}%`);
      }
      linhas.push('', `DAS TOTAL CALCULADO: ${formatarMoeda(apuracaoSimples.dasTotalCalculado)}`);
    } else {
      linhas.push('Apuração oficial (RBT12/Fator R/Anexo) ainda não calculada -- veja a seção "Apuração oficial do Simples Nacional" na tela.');
    }

    linhas.push(
      '',
      `ICMS destacado (vendas, informativo): ${formatarMoeda(somar(saida, 'valorIcms'))}`,
      `ICMS-ST destacado (vendas, informativo): ${formatarMoeda(somar(saida, 'valorIcmsSt'))}`,
      `CBS débito (vendas): ${formatarMoeda(debitoCbs)}`,
      `IBS débito (vendas): ${formatarMoeda(debitoIbs)}`,
    );
    if (ehHibrido) {
      linhas.push(`CBS crédito (compras): ${formatarMoeda(creditoCbs)}`, `IBS crédito (compras): ${formatarMoeda(creditoIbs)}`);
      linhas.push(`CBS a recolher: ${formatarMoeda(debitoCbs - creditoCbs)}`, `IBS a recolher: ${formatarMoeda(debitoIbs - creditoIbs)}`);
    }
    linhas.push(
      '',
      'ATENÇÃO: RBT12/Fator R/Anexo/alíquota efetiva/partilha calculados automaticamente a partir dos dados deste sistema ' +
        '(notas capturadas + histórico de receita + CST de ICMS/PIS/COFINS de cada item) -- confira os meses marcados ' +
        '"faltando"/"manual", o Fator R e os baldes de partilha antes de confiar no valor. CST de PIS/COFINS 06-09 ' +
        '(alíquota zero/isenta/sem incidência/suspensão) são tratados como receita normal por padrão conservador -- se ' +
        'algum desses CST na carteira do cliente for na prática monofásico, isso precisa de ajuste manual com o contador. ' +
        'Transmissão automática pro SERPRO ainda não implementada -- lance você mesmo no PGDAS-D.',
    );
    return linhas.join('\n');
  }

  async function copiarResumo() {
    try {
      await navigator.clipboard.writeText(montarResumoTexto());
      showSuccess('Resumo copiado -- cole no PGDAS-D ou mande pro contador conferir.');
    } catch {
      showError('Não foi possível copiar -- selecione o texto manualmente.');
    }
  }

  const porCfop = useMemo(() => {
    const mapa = new Map<string, any>();
    for (const item of itens) {
      const chave = `${item.direcao}:${item.cfop}`;
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          direcao: item.direcao,
          cfop: item.cfop,
          quantidade: 0,
          valorTotal: 0,
          valorIcms: 0,
          valorIcmsSt: 0,
          valorPis: 0,
          valorCofins: 0,
          valorCbs: 0,
          valorIbs: 0,
          categorias: new Set<string>(),
        });
      }
      const linha = mapa.get(chave);
      linha.quantidade += 1;
      linha.valorTotal += item.valorTotal;
      linha.valorIcms += item.valorIcms;
      linha.valorIcmsSt += item.valorIcmsSt;
      linha.valorPis += item.valorPis;
      linha.valorCofins += item.valorCofins;
      linha.valorCbs += item.valorCbs;
      linha.valorIbs += item.valorIbs;
      linha.categorias.add(item.categoriaTributacao);
    }
    return Array.from(mapa.values()).sort((a, b) => a.cfop.localeCompare(b.cfop));
  }, [itens]);

  const itensFiltrados = filtroCfop.trim() ? itens.filter((i) => i.cfop.includes(filtroCfop.trim())) : [];

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <Scale className="mr-2 h-6 w-6" /> Apuração Tributária
        </h1>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="competencia-inicio">Competência início</Label>
            <Input id="competencia-inicio" type="month" max={mesInput(0)} value={competenciaInicio} onChange={(e) => setCompetenciaInicio(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="competencia-fim">Competência fim</Label>
            <Input id="competencia-fim" type="month" max={mesInput(0)} value={competenciaFim} onChange={(e) => setCompetenciaFim(e.target.value)} />
          </div>
          <Button onClick={carregar} disabled={carregando} className="sm:w-auto">
            {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Apurar
          </Button>
        </CardContent>
      </Card>

      {carregando ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-blue-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ICMS (vendas)</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold">{formatarMoeda(somar(saida, 'valorIcms'))}</div></CardContent>
            </Card>
            <Card className="border-l-4 border-blue-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ICMS-ST (vendas)</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold">{formatarMoeda(somar(saida, 'valorIcmsSt'))}</div></CardContent>
            </Card>
            <Card className="border-l-4 border-purple-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">PIS (vendas)</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold">{formatarMoeda(somar(saida, 'valorPis'))}</div></CardContent>
            </Card>
            <Card className="border-l-4 border-purple-500">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">COFINS (vendas)</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold">{formatarMoeda(somar(saida, 'valorCofins'))}</div></CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                CBS e IBS
                {ehHibrido ? <Badge variant="success">Simples Híbrido -- apuração própria</Badge> : <Badge variant="warning">Incluso no DAS (informativo)</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Débito (vendas)</p>
                  <p className="text-lg font-bold">CBS {formatarMoeda(debitoCbs)}</p>
                  <p className="text-lg font-bold">IBS {formatarMoeda(debitoIbs)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Crédito (compras){!ehHibrido && ' -- não aproveitado fora do híbrido'}</p>
                  <p className="text-lg font-bold">CBS {formatarMoeda(creditoCbs)}</p>
                  <p className="text-lg font-bold">IBS {formatarMoeda(creditoIbs)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{ehHibrido ? 'A recolher (débito - crédito)' : 'Já incluso no DAS'}</p>
                  {ehHibrido ? (
                    <>
                      <p className="text-lg font-bold">CBS {formatarMoeda(debitoCbs - creditoCbs)}</p>
                      <p className="text-lg font-bold">IBS {formatarMoeda(debitoIbs - creditoIbs)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Esta empresa não está marcada como Simples Híbrido -- CBS/IBS ficam embutidos no DAS único, sem crédito de compra.
                      Os valores acima são só o que veio destacado nas notas.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Apuração oficial do Simples Nacional -- competência {competenciaFim}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rbt12 && (
                <div>
                  <p className="mb-2 text-sm font-medium">RBT12 (receita bruta dos 12 meses anteriores)</p>
                  <div className="space-y-2">
                    {rbt12.meses.map((mes: any) => {
                      const expandido = mesExpandido === mes.competencia;
                      return (
                        <div key={mes.competencia} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{formatarCompetencia(mes.competencia)}</span>
                            <Badge variant={mes.origemComercioIndustria === 'ausente' ? 'destructive' : mes.origemComercioIndustria === 'manual' ? 'warning' : 'success'}>
                              {ROTULO_ORIGEM[mes.origemComercioIndustria]}
                            </Badge>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Comércio/Indústria</Label>
                              <Input
                                type="number"
                                defaultValue={mes.comercioIndustria}
                                className="h-9"
                                disabled={salvandoReceita === `${mes.competencia}:comercio_industria`}
                                onBlur={(e) => {
                                  const novoValor = Number(e.target.value);
                                  if (novoValor !== mes.comercioIndustria) salvarReceitaManual(mes.competencia, 'comercio_industria', novoValor);
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Serviço</Label>
                              <Input
                                type="number"
                                defaultValue={mes.servico}
                                className="h-9"
                                disabled={salvandoReceita === `${mes.competencia}:servico`}
                                onBlur={(e) => {
                                  const novoValor = Number(e.target.value);
                                  if (novoValor !== mes.servico) salvarReceitaManual(mes.competencia, 'servico', novoValor);
                                }}
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              aria-expanded={expandido}
                              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              onClick={() => alternarMesExpandido(mes)}
                            >
                              {expandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              {expandido ? 'Ocultar detalhamento por CFOP' : 'Ver detalhamento por CFOP'}
                            </button>
                            <Button type="button" size="sm" variant="destructive" className="h-7 text-xs" onClick={() => abrirDialogTransmissao(mes)}>
                              <Send className="mr-1 h-3.5 w-3.5" /> Transmitir declaração e gerar DAS
                            </Button>
                          </div>
                          {expandido && (
                            <div className="mt-2 border-t pt-2">
                              <DetalheMesRbt12 mes={mes} itens={itensPorMes[mes.competencia]} carregando={carregandoMes === mes.competencia} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Meses "faltando" não têm nota capturada nem valor manual -- edite o campo e saia do campo (Tab/clique fora) pra salvar.
                    "Nota fiscal" é só informativo (o valor pode ser ajustado à mão também).
                  </p>
                </div>
              )}

              {precisaAtividadeServico && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800">
                    <AlertTriangle className="h-4 w-4" /> Há receita de serviço neste mês -- escolha a atividade pra determinar o Anexo
                  </p>
                  <Select value={chaveAtividadeServico} onValueChange={aoEscolherAtividadeServico}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione a atividade de serviço..." />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogoAtividades.map((a) => (
                        <SelectItem key={a.chave} value={a.chave}>
                          {a.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {fatorR && (
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Fator R</p>
                  {fatorR.temContaConfigurada ? (
                    <p>
                      Folha de pagamento (12 meses): <span className="font-mono">{formatarMoeda(fatorR.folhaPagamento12Meses)}</span> -- Fator R:{' '}
                      <span className="font-mono">{((fatorR.fatorR ?? 0) * 100).toFixed(2)}%</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Nenhuma conta do Plano de Contas está marcada "conta de folha de pagamento" -- Fator R fica em 0% até marcar (Plano de
                      Contas &gt; editar conta &gt; "entra no Fator R").
                    </p>
                  )}
                </div>
              )}

              {apuracaoSimples && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Comércio/Indústria -- Anexo {apuracaoSimples.comercioIndustria.anexo}</p>
                    <p className="text-sm">Receita do mês: <span className="font-mono">{formatarMoeda(apuracaoSimples.comercioIndustria.receitaDoMes)}</span></p>
                    <p className="text-sm">Alíquota efetiva: <span className="font-mono">{(apuracaoSimples.comercioIndustria.aliquotaEfetiva * 100).toFixed(4)}%</span></p>
                    <TabelaBaldes baldes={apuracaoSimples.comercioIndustria.baldes} />
                    <p className="mt-2 text-lg font-bold">DAS: {formatarMoeda(apuracaoSimples.comercioIndustria.dasDevido)}</p>
                  </div>
                  {apuracaoSimples.servico && (
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Serviço -- Anexo {apuracaoSimples.servico.anexo}</p>
                      <p className="text-sm">Receita do mês: <span className="font-mono">{formatarMoeda(apuracaoSimples.servico.receitaDoMes)}</span></p>
                      <p className="text-sm">Alíquota efetiva: <span className="font-mono">{(apuracaoSimples.servico.aliquotaEfetiva * 100).toFixed(4)}%</span></p>
                      <p className="mt-1 text-xs text-muted-foreground">Receita de serviço vem sempre de lançamento manual (sem CST pra segregar) -- fica 100% no balde normal.</p>
                      <p className="mt-2 text-lg font-bold">DAS: {formatarMoeda(apuracaoSimples.servico.dasDevido)}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col items-start justify-between gap-3 border-t pt-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-medium">DAS total calculado</p>
                  <p className="text-2xl font-bold">{apuracaoSimples ? formatarMoeda(apuracaoSimples.dasTotalCalculado) : '—'}</p>
                </div>
                <Button onClick={() => setDialogEnvioAberto(true)}>
                  <Send className="mr-2 h-4 w-4" /> Enviar para o Simples Nacional
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Apuração por CFOP</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Direção</TableHead>
                      <TableHead>CFOP</TableHead>
                      <TableHead>Tributação</TableHead>
                      <TableHead className="text-right">Itens</TableHead>
                      <TableHead className="text-right">Vlr. produtos</TableHead>
                      <TableHead className="text-right">ICMS</TableHead>
                      <TableHead className="text-right">ICMS-ST</TableHead>
                      <TableHead className="text-right">PIS</TableHead>
                      <TableHead className="text-right">COFINS</TableHead>
                      <TableHead className="text-right">CBS</TableHead>
                      <TableHead className="text-right">IBS</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porCfop.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                          Nenhuma nota no período selecionado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      porCfop.map((linha) => (
                        <TableRow key={`${linha.direcao}:${linha.cfop}`}>
                          <TableCell>
                            <Badge variant={linha.direcao === 'entrada' ? 'warning' : 'success'}>{linha.direcao === 'entrada' ? 'Entrada' : 'Saída'}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{linha.cfop}</TableCell>
                          <TableCell>
                            {linha.categorias.size > 1 ? (
                              <Badge variant="destructive">Misto</Badge>
                            ) : (
                              <Badge variant={VARIANTE_CATEGORIA_TRIBUTACAO[[...linha.categorias][0]]}>
                                {ROTULO_CATEGORIA_TRIBUTACAO[[...linha.categorias][0]]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">{linha.quantidade}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatarMoeda(linha.valorTotal)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatarMoeda(linha.valorIcms)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatarMoeda(linha.valorIcmsSt)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatarMoeda(linha.valorPis)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatarMoeda(linha.valorCofins)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatarMoeda(linha.valorCbs)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatarMoeda(linha.valorIbs)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => setFiltroCfop(linha.cfop)}>
                              Ver notas
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Notas por CFOP específico</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ex: 5404"
                  value={filtroCfop}
                  onChange={(e) => setFiltroCfop(e.target.value)}
                  className="w-40"
                />
                {filtroCfop && (
                  <Button variant="outline" size="sm" onClick={() => setFiltroCfop('')}>
                    Limpar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtroCfop.trim() ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº/Série</TableHead>
                        <TableHead>Emissão</TableHead>
                        <TableHead>Contraparte</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Nenhuma nota com CFOP contendo "{filtroCfop}" no período.
                          </TableCell>
                        </TableRow>
                      ) : (
                        itensFiltrados.map((item, indice) => (
                          <TableRow key={`${item.notaFiscalId}-${indice}`}>
                            <TableCell className="font-mono text-sm">{item.numero}/{item.serie}</TableCell>
                            <TableCell className="text-sm">{formatarData(item.dataEmissao)}</TableCell>
                            <TableCell className="text-sm">{item.contraparte}</TableCell>
                            <TableCell className="text-sm">{item.descricao}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatarMoeda(item.valorTotal)}</TableCell>
                            <TableCell>
                              <Badge variant={item.statusNota === 'aprovada' ? 'success' : item.statusNota === 'rejeitada' ? 'destructive' : 'warning'}>
                                {item.statusNota === 'aprovada' ? 'Aprovada' : item.statusNota === 'rejeitada' ? 'Rejeitada' : 'Pendente'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  Digite um CFOP (ex: 5404) ou clique em "Ver notas" numa linha da tabela acima pra listar as notas desse CFOP.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogEnvioAberto} onOpenChange={setDialogEnvioAberto}>
        <DialogContent className="max-w-md md:max-w-[85%]">
          <DialogHeader>
            <DialogTitle>Enviar para o Simples Nacional</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              RBT12, Fator R, Anexo e alíquota efetiva já são calculados automaticamente abaixo. Cada card de mês do RBT12 (acima) tem um
              botão "Transmitir declaração e gerar DAS" que já transmite de verdade pro SERPRO -- use este resumo manual só pra Anexo V, pra
              receita com PIS/COFINS já recolhido isoladamente (ainda não suportados pela transmissão automática), ou se preferir lançar você
              mesmo no Portal do Simples Nacional.
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">{montarResumoTexto()}</pre>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copiarResumo}>
                Copiar resumo
              </Button>
              <Button variant="outline" onClick={() => window.open(URL_PORTAL_SIMPLES_NACIONAL, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir Portal do Simples Nacional
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mesTransmitindo} onOpenChange={(aberto) => !aberto && setMesTransmitindo(null)}>
        <DialogContent className="max-w-md md:max-w-[85%]">
          <DialogHeader>
            <DialogTitle>Transmitir declaração e gerar DAS -- {mesTransmitindo && formatarCompetencia(mesTransmitindo.competencia)}</DialogTitle>
          </DialogHeader>
          {mesTransmitindo && (
            <div className="space-y-3">
              <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mr-1 inline h-4 w-4" /> Isso transmite a declaração oficial do Simples Nacional pra Receita Federal
                via SERPRO e gera o DAS do mês. Não há como desfazer -- só retificação formal depois. Confira os números abaixo antes de
                prosseguir.
              </p>
              <div className="rounded-md border p-3 text-sm">
                <p>Comércio/Indústria: <span className="font-mono">{formatarMoeda(mesTransmitindo.comercioIndustria)}</span></p>
                <p>Serviço: <span className="font-mono">{formatarMoeda(mesTransmitindo.servico)}</span></p>
                {apuracaoSimples?.competencia === `${mesTransmitindo.competencia.slice(0, 7)}-01` && (
                  <p className="mt-1 font-bold">DAS calculado: {formatarMoeda(apuracaoSimples.dasTotalCalculado)}</p>
                )}
              </div>

              {!resultadoTransmissao && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Digite a competência ({formatarCompetencia(mesTransmitindo.competencia)}) pra confirmar
                    </Label>
                    <Input value={confirmacaoCompetencia} onChange={(e) => setConfirmacaoCompetencia(e.target.value)} placeholder="ex: 11/2026" />
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={confirmacaoCompetencia.trim() !== formatarCompetencia(mesTransmitindo.competencia) || transmitindo}
                    onClick={confirmarTransmissao}
                  >
                    {transmitindo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Confirmar transmissão
                  </Button>
                </>
              )}

              {resultadoTransmissao && (
                <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
                  <p>Declaração transmitida{resultadoTransmissao.numeroDeclaracao ? ` -- nº ${resultadoTransmissao.numeroDeclaracao}` : ''}.</p>
                  {resultadoTransmissao.dasGerado ? (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => window.open(resultadoTransmissao.url, '_blank', 'noopener,noreferrer')}>
                      Abrir PDF do DAS
                    </Button>
                  ) : (
                    <p className="mt-1 text-amber-800">
                      A declaração já foi transmitida, mas a geração do DAS falhou ({resultadoTransmissao.motivoFalhaDas}) -- tente gerar a
                      2ª via separadamente na tela de DAS.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
