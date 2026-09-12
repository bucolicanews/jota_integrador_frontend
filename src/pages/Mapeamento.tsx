import { useEffect, useMemo, useState } from 'react';
import { Link2, Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PainelTransacoesPendentes from '../components/conciliacao/PainelTransacoesPendentes';
import TabelaTransacoesConciliadas from '../components/mapeamento/TabelaTransacoesConciliadas';
import TabelaParcelasEmAberto, { ParcelaEmAberto } from '../components/mapeamento/TabelaParcelasEmAberto';
import DetalheContaPagarDialog from '../components/contas-pagar/DetalheContaPagarDialog';
import DetalheContaReceberDialog from '../components/contas-receber/DetalheContaReceberDialog';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarPlanoContas } from '../servicos/planoContas';
import { listarPendentes, listarLancamentosConciliados } from '../servicos/conciliacaoBancaria';
import { listarContasPagar } from '../servicos/contasAPagar';
import { listarContasReceber } from '../servicos/contasAReceber';
import { showError } from '../utils/toast';

/**
 * Triagem em massa cross-conta (equivalente a `Mapeamento.tsx` do jotaCaixa), separado da
 * Conciliação Bancária (que é por-conta/por-importação): aqui o contador vê tudo que precisa
 * de atenção manual de uma vez, sem escolher uma conta bancária primeiro. Diferente do
 * jotaCaixa, não existe aba "desmapear" -- desfazer uma conciliação exigiria estornar o
 * lançamento contábil gerado (fluxo próprio de estorno já existe em CP/CR, mas ainda não
 * pra este caso), e as "parcelas não mapeadas" aqui são simplesmente parcelas em aberto
 * (nosso modelo não distingue "vinculada mas não paga" de "paga" -- vincular É pagar).
 */
export default function Mapeamento() {
  const { empresaId } = useEmpresaAtiva();

  const [contas, setContas] = useState<any[]>([]);
  const [contasResultado, setContasResultado] = useState<any[]>([]);

  const [pendentes, setPendentes] = useState<any[]>([]);
  const [carregandoPendentes, setCarregandoPendentes] = useState(false);

  const [conciliadas, setConciliadas] = useState<any[]>([]);
  const [carregandoConciliadas, setCarregandoConciliadas] = useState(false);

  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [carregandoParcelas, setCarregandoParcelas] = useState(false);

  const [contaPagarSelecionadaId, setContaPagarSelecionadaId] = useState<string | null>(null);
  const [contaReceberSelecionadaId, setContaReceberSelecionadaId] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    listarPlanoContas(empresaId)
      .then((lista) => {
        setContas(lista.filter((c: any) => c.contaCaixaBanco && !c.sintetica));
        setContasResultado(lista.filter((c: any) => !c.sintetica && !c.contaCaixaBanco));
      })
      .catch((erro) => showError(erro.message));
  }, [empresaId]);

  function carregarPendentes() {
    if (!empresaId) return;
    setCarregandoPendentes(true);
    listarPendentes(empresaId)
      .then(setPendentes)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregandoPendentes(false));
  }

  function carregarConciliadas() {
    if (!empresaId) return;
    setCarregandoConciliadas(true);
    listarLancamentosConciliados(empresaId)
      .then(setConciliadas)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregandoConciliadas(false));
  }

  function carregarParcelas() {
    if (!empresaId) return;
    setCarregandoParcelas(true);
    Promise.all([listarContasPagar(empresaId), listarContasReceber(empresaId)])
      .then(([cp, cr]) => {
        setContasPagar(cp);
        setContasReceber(cr);
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregandoParcelas(false));
  }

  useEffect(carregarPendentes, [empresaId]);

  const parcelasCPEmAberto: ParcelaEmAberto[] = useMemo(
    () =>
      contasPagar
        .filter((c) => !c.cancelada)
        .flatMap((c) =>
          c.parcelas
            .filter((p: any) => !p.cancelada && p.status !== 'paga')
            .map((p: any) => ({
              contaId: c.id,
              parcelaId: p.id,
              nomeParte: c.fornecedor,
              descricao: c.descricao,
              numeroParcela: p.numeroParcela,
              totalParcelas: c.parcelas.length,
              valorParcela: p.valorParcela,
              dataVencimento: p.dataVencimento,
              status: p.status,
            })),
        )
        .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)),
    [contasPagar],
  );

  const parcelasCREmAberto: ParcelaEmAberto[] = useMemo(
    () =>
      contasReceber
        .filter((c) => !c.cancelada)
        .flatMap((c) =>
          c.parcelas
            .filter((p: any) => !p.cancelada && p.status !== 'paga')
            .map((p: any) => ({
              contaId: c.id,
              parcelaId: p.id,
              nomeParte: c.clienteNome,
              descricao: c.descricao,
              numeroParcela: p.numeroParcela,
              totalParcelas: c.parcelas.length,
              valorParcela: p.valorParcela,
              dataVencimento: p.dataVencimento,
              status: p.status,
            })),
        )
        .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)),
    [contasReceber],
  );

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <Link2 className="mr-2 h-6 w-6" /> Mapeamento de Extratos e Parcelas
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Triagem cross-conta</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="nao-conciliadas"
            onValueChange={(aba) => {
              if (aba === 'conciliadas') carregarConciliadas();
              if (aba === 'parcelas-cp' || aba === 'parcelas-cr') carregarParcelas();
            }}
          >
            <TabsList className="mb-4 h-auto flex-wrap gap-1">
              <TabsTrigger value="nao-conciliadas">Não Conciliadas ({pendentes.filter((t) => t.status === 'pendente').length})</TabsTrigger>
              <TabsTrigger value="conciliadas">Conciliadas</TabsTrigger>
              <TabsTrigger value="parcelas-cp" className="flex items-center gap-1">
                <ArrowDownCircle className="h-4 w-4" /> CP em Aberto ({parcelasCPEmAberto.length})
              </TabsTrigger>
              <TabsTrigger value="parcelas-cr" className="flex items-center gap-1">
                <ArrowUpCircle className="h-4 w-4" /> CR em Aberto ({parcelasCREmAberto.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nao-conciliadas">
              {carregandoPendentes ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <PainelTransacoesPendentes empresaId={empresaId} transacoes={pendentes} contasResultado={contasResultado} onMudou={carregarPendentes} />
              )}
            </TabsContent>

            <TabsContent value="conciliadas">
              <TabelaTransacoesConciliadas transacoes={conciliadas} contas={contas} contasResultado={contasResultado} carregando={carregandoConciliadas} />
            </TabsContent>

            <TabsContent value="parcelas-cp">
              <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/20">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Parcelas de Contas a Pagar ainda em aberto -- clique numa linha pra abrir a conta e registrar o pagamento.
                </p>
              </div>
              <TabelaParcelasEmAberto parcelas={parcelasCPEmAberto} carregando={carregandoParcelas} rotuloParte="Fornecedor" onAbrirConta={setContaPagarSelecionadaId} />
            </TabsContent>

            <TabsContent value="parcelas-cr">
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Parcelas de Contas a Receber ainda em aberto -- clique numa linha pra abrir a conta e registrar o recebimento.
                </p>
              </div>
              <TabelaParcelasEmAberto parcelas={parcelasCREmAberto} carregando={carregandoParcelas} rotuloParte="Cliente" onAbrirConta={setContaReceberSelecionadaId} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <DetalheContaPagarDialog
        empresaId={empresaId}
        contaId={contaPagarSelecionadaId}
        contasCaixaBanco={contas}
        open={contaPagarSelecionadaId !== null}
        onOpenChange={(open) => {
          if (!open) setContaPagarSelecionadaId(null);
        }}
        onMudou={carregarParcelas}
      />

      <DetalheContaReceberDialog
        empresaId={empresaId}
        contaId={contaReceberSelecionadaId}
        contasCaixaBanco={contas}
        open={contaReceberSelecionadaId !== null}
        onOpenChange={(open) => {
          if (!open) setContaReceberSelecionadaId(null);
        }}
        onMudou={carregarParcelas}
      />
    </LayoutPrincipal>
  );
}
