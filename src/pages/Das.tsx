import { useEffect, useState } from 'react';
import { Loader2, ReceiptText, RefreshCw } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { gerarSegundaViaDas, listarDas, obterUrlPdfDas, sincronizarDas } from '../servicos/das';
import { showError } from '../utils/toast';

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
  const { empresaId } = useEmpresaAtiva();
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);
  const [gerandoSegundaViaId, setGerandoSegundaViaId] = useState<string | null>(null);
  const [dialogSegundaVia, setDialogSegundaVia] = useState<{ dasId: string; competencia: string } | null>(null);
  const [dataConsolidacao, setDataConsolidacao] = useState('');
  // Guarda de regime vem do próprio backend (400 se a empresa não for MEI/Simples
  // Nacional) -- evita uma chamada extra só pra checar `regimeTributario` antes.
  const [naoAplicavel, setNaoAplicavel] = useState(false);

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
  }
  useEffect(carregar, [empresaId]);

  function sincronizar() {
    if (!empresaId) return;
    setSincronizando(true);
    sincronizarDas(empresaId)
      .then(() => carregar())
      .catch((erro) => showError(erro.message))
      .finally(() => setSincronizando(false));
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
      const { url } = await gerarSegundaViaDas(empresaId, dasId, dataConsolidacao);
      if (aba) aba.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
      setDialogSegundaVia(null);
      carregar();
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
        <Button onClick={sincronizar} disabled={sincronizando || naoAplicavel} className="w-full sm:w-auto">
          <RefreshCw className={`mr-2 h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} /> Sincronizar agora
        </Button>
      </div>

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
                          <div className="flex justify-end gap-2">
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
    </LayoutPrincipal>
  );
}
