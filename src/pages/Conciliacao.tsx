import { useEffect, useState } from 'react';
import { Landmark, Loader2, PlusCircle, Upload, History as HistoryIcon, Eye, FilePlus2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FormConfiguracaoConciliacao from '../components/conciliacao/FormConfiguracaoConciliacao';
import FormExtratoManual from '../components/conciliacao/FormExtratoManual';
import PainelTransacoesPendentes from '../components/conciliacao/PainelTransacoesPendentes';
import DetalheImportacaoDialog from '../components/conciliacao/DetalheImportacaoDialog';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarPlanoContas } from '../servicos/planoContas';
import {
  listarConfiguracoes,
  preVisualizarExtrato,
  listarPendentes,
  listarImportacoes,
} from '../servicos/conciliacaoBancaria';
import { showError, showSuccess } from '../utils/toast';

const formatarTimestamp = (iso: string) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

export default function Conciliacao() {
  const { empresaId } = useEmpresaAtiva();

  const [contas, setContas] = useState<any[]>([]);
  const [contasResultado, setContasResultado] = useState<any[]>([]);
  const [carregandoContas, setCarregandoContas] = useState(false);

  const [contaSelecionadaId, setContaSelecionadaId] = useState<string>('');
  const [configs, setConfigs] = useState<any[]>([]);
  const [configSelecionadaId, setConfigSelecionadaId] = useState<string>('');
  const [dialogConfigAberto, setDialogConfigAberto] = useState(false);
  const [dialogExtratoManualAberto, setDialogExtratoManualAberto] = useState(false);

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [processandoPreview, setProcessandoPreview] = useState(false);
  const [transacoesPreview, setTransacoesPreview] = useState<any[] | null>(null);

  const [pendentesGlobais, setPendentesGlobais] = useState<any[]>([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(false);

  const [importacoes, setImportacoes] = useState<any[]>([]);
  const [carregandoImportacoes, setCarregandoImportacoes] = useState(false);
  const [importacaoSelecionadaId, setImportacaoSelecionadaId] = useState<string | null>(null);

  const configSelecionada = configs.find((c) => c.id === configSelecionadaId) ?? null;

  function carregarContas() {
    if (!empresaId) return;
    setCarregandoContas(true);
    listarPlanoContas(empresaId)
      .then((lista) => {
        setContas(lista.filter((c: any) => c.contaCaixaBanco && !c.sintetica));
        setContasResultado(lista.filter((c: any) => !c.sintetica && !c.contaCaixaBanco));
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregandoContas(false));
  }
  useEffect(carregarContas, [empresaId]);

  function carregarConfigs() {
    if (!empresaId || !contaSelecionadaId) {
      setConfigs([]);
      return;
    }
    listarConfiguracoes(empresaId, contaSelecionadaId)
      .then(setConfigs)
      .catch((erro) => showError(erro.message));
  }
  useEffect(carregarConfigs, [empresaId, contaSelecionadaId]);

  function carregarPendentesGlobais() {
    if (!empresaId) return;
    setCarregandoPendentes(true);
    listarPendentes(empresaId, contaSelecionadaId || undefined)
      .then(setPendentesGlobais)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregandoPendentes(false));
  }

  function carregarImportacoes() {
    if (!empresaId) return;
    setCarregandoImportacoes(true);
    listarImportacoes(empresaId, contaSelecionadaId || undefined)
      .then(setImportacoes)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregandoImportacoes(false));
  }

  function aoSelecionarConta(id: string) {
    setContaSelecionadaId(id);
    setConfigSelecionadaId('');
    setArquivo(null);
    setTransacoesPreview(null);
  }

  async function aoProcessarArquivo() {
    if (!arquivo || !configSelecionada || !contaSelecionadaId) {
      showError('Selecione a conta, a configuração e o arquivo.');
      return;
    }
    setProcessandoPreview(true);
    try {
      const resultado = await preVisualizarExtrato(empresaId!, {
        arquivo,
        contaContabilId: contaSelecionadaId,
        mapeamento: configSelecionada.mapeamento,
        colunaTipoTransacao: configSelecionada.colunaTipoTransacao,
        valorCredito: configSelecionada.valorCredito,
      });
      setTransacoesPreview(resultado.transacoes);
      showSuccess(
        resultado.retomada
          ? 'Este arquivo já tinha sido importado -- mostrando o que já foi salvo.'
          : `${resultado.transacoes.length} transações extraídas do arquivo.`,
      );
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível processar o arquivo');
    } finally {
      setProcessandoPreview(false);
    }
  }

  function aoMudarPreview() {
    if (!empresaId || !contaSelecionadaId) return;
    listarPendentes(empresaId, contaSelecionadaId)
      .then((todasPendentes) => {
        if (!transacoesPreview) return;
        const idsPreview = new Set(transacoesPreview.map((t) => t.id));
        setTransacoesPreview((prev) => (prev ?? []).map((t) => todasPendentes.find((p: any) => p.id === t.id) ?? t).filter((t) => t.status === 'pendente' || t.status === 'duplicada' || idsPreview.has(t.id)));
      })
      .catch(() => {});
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <Landmark className="mr-2 h-6 w-6" /> Conciliação Bancária
        </h1>
        <Button variant="outline" onClick={() => setDialogExtratoManualAberto(true)} className="w-full sm:w-auto">
          <FilePlus2 className="mr-2 h-4 w-4" /> Lançar extrato manual
        </Button>
      </div>

      <Tabs defaultValue="conciliacao" className="w-full" onValueChange={(aba) => {
        if (aba === 'pendencias') carregarPendentesGlobais();
        if (aba === 'historico') carregarImportacoes();
      }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="conciliacao">Nova Conciliação</TabsTrigger>
          <TabsTrigger value="pendencias">Pendências</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="conciliacao" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Passo 1: Conta bancária</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select onValueChange={aoSelecionarConta} value={contaSelecionadaId || undefined} disabled={carregandoContas}>
                    <SelectTrigger>
                      <SelectValue placeholder={carregandoContas ? 'Carregando...' : 'Selecione a conta para conciliar'} />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.codigo} — {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {contas.length === 0 && !carregandoContas && (
                    <p className="mt-2 text-sm text-destructive">Nenhuma conta marcada como "Caixa/Banco" no Plano de Contas.</p>
                  )}
                </CardContent>
              </Card>

              {contaSelecionadaId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Passo 2: Configuração de importação</CardTitle>
                    <CardDescription>Mapeamento das colunas do CSV do seu banco.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select onValueChange={setConfigSelecionadaId} value={configSelecionadaId || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma configuração" />
                      </SelectTrigger>
                      <SelectContent>
                        {configs.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nomeConfiguracao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button variant="outline" className="w-full" onClick={() => setDialogConfigAberto(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nova
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {configSelecionada && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Passo 3: Importar extrato</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2">
                    <Input type="file" accept=".csv,text/csv" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="flex-1" />
                    <Button onClick={aoProcessarArquivo} disabled={!arquivo || processandoPreview}>
                      {processandoPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {transacoesPreview && (
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Transações do arquivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PainelTransacoesPendentes empresaId={empresaId} transacoes={transacoesPreview} contasResultado={contasResultado} onMudou={aoMudarPreview} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pendencias" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transações pendentes de categorização</CardTitle>
              <CardDescription>Todas as transações já importadas que ainda não foram conciliadas, ignoradas ou vinculadas.</CardDescription>
            </CardHeader>
            <CardContent>
              {carregandoPendentes ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <PainelTransacoesPendentes empresaId={empresaId} transacoes={pendentesGlobais} contasResultado={contasResultado} onMudou={carregarPendentesGlobais} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-base">
                <HistoryIcon className="mr-2 h-4 w-4" /> Histórico de importações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {carregandoImportacoes ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[150px]">Data</TableHead>
                        <TableHead className="min-w-[200px]">Arquivo</TableHead>
                        <TableHead className="w-[90px] text-right">Pendentes</TableHead>
                        <TableHead className="w-[100px] text-right">Conciliadas</TableHead>
                        <TableHead className="w-[100px] text-right">Duplicadas</TableHead>
                        <TableHead className="w-[90px] text-right">Ignoradas</TableHead>
                        <TableHead className="w-[100px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importacoes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Nenhuma importação encontrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        importacoes.map((imp) => (
                          <TableRow key={imp.id}>
                            <TableCell className="text-sm">{formatarTimestamp(imp.criadoEm)}</TableCell>
                            <TableCell className="font-mono text-xs">{imp.nomeArquivo}</TableCell>
                            <TableCell className="text-right">{imp.totalPendentes}</TableCell>
                            <TableCell className="text-right">{imp.totalConciliadas}</TableCell>
                            <TableCell className="text-right">{imp.totalDuplicadas}</TableCell>
                            <TableCell className="text-right">{imp.totalIgnoradas}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => setImportacaoSelecionadaId(imp.id)}>
                                <Eye className="mr-2 h-4 w-4" /> Detalhes
                              </Button>
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
        </TabsContent>
      </Tabs>

      {contaSelecionadaId && (
        <Dialog open={dialogConfigAberto} onOpenChange={setDialogConfigAberto}>
          <DialogContent className="max-w-md md:max-w-[85%]">
            <DialogHeader>
              <DialogTitle>Nova configuração do extrato</DialogTitle>
            </DialogHeader>
            <FormConfiguracaoConciliacao
              empresaId={empresaId}
              contaContabilId={contaSelecionadaId}
              onSaveComplete={() => {
                setDialogConfigAberto(false);
                carregarConfigs();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={dialogExtratoManualAberto} onOpenChange={setDialogExtratoManualAberto}>
        <DialogContent className="max-w-md md:max-w-[70%]">
          <DialogHeader>
            <DialogTitle>Lançar extrato manual</DialogTitle>
          </DialogHeader>
          <FormExtratoManual
            empresaId={empresaId}
            contasCaixaBanco={contas}
            contasPlano={contasResultado}
            onSaveComplete={() => {
              setDialogExtratoManualAberto(false);
              carregarImportacoes();
            }}
          />
        </DialogContent>
      </Dialog>

      <DetalheImportacaoDialog
        empresaId={empresaId}
        importacaoId={importacaoSelecionadaId}
        open={importacaoSelecionadaId !== null}
        onOpenChange={(open) => {
          if (!open) setImportacaoSelecionadaId(null);
        }}
      />
    </LayoutPrincipal>
  );
}
