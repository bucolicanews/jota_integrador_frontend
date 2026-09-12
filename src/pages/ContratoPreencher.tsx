import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { obterModeloContrato, preVisualizarContrato, criarContrato } from '../servicos/contratos';
import { listarClientes } from '../servicos/clientes';
import { extrairTagsDoTemplate } from '../utils/renderizarTags';
import { showError, showSuccess } from '../utils/toast';

// Mirror de TAGS_SISTEMA (backend contratos/dominio/contrato.ts) -- resolvidas
// automaticamente, nunca preenchidas manualmente pelo usuário no formulário.
const TAGS_SISTEMA = [
  'CLIENTE_NOME', 'CLIENTE_RAZAO_SOCIAL', 'CLIENTE_DOCUMENTO', 'CLIENTE_EMAIL', 'CLIENTE_TELEFONE', 'CLIENTE_ENDERECO',
  'EMPRESA_RAZAO_SOCIAL', 'EMPRESA_NOME_FANTASIA', 'EMPRESA_CNPJ', 'VALOR_TOTAL', 'QUANTIDADE_PARCELAS', 'DATA_HOJE',
];

const hoje = () => new Date().toISOString().slice(0, 10);

export default function ContratoPreencher() {
  const { empresaId } = useEmpresaAtiva();
  const { modeloId } = useParams();
  const navigate = useNavigate();

  const [modelo, setModelo] = useState<any | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [titulo, setTitulo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [valoresManuais, setValoresManuais] = useState<Record<string, string>>({});
  const [comValor, setComValor] = useState(false);
  const [valorTotal, setValorTotal] = useState('');
  const [modoParcelamento, setModoParcelamento] = useState<'unico' | 'parcelar' | 'repetir'>('parcelar');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('2');
  const [primeiroVencimento, setPrimeiroVencimento] = useState(hoje());
  const [intervaloDias, setIntervaloDias] = useState('30');

  const [preview, setPreview] = useState('');
  const [gerandoPreview, setGerandoPreview] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId || !modeloId) return;
    Promise.all([obterModeloContrato(empresaId, modeloId), listarClientes(empresaId, true)])
      .then(([m, cs]) => {
        setModelo(m);
        setTitulo(m.titulo);
        setClientes(cs);
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }, [empresaId, modeloId]);

  const tagsManuais = useMemo(() => {
    if (!modelo) return [];
    return extrairTagsDoTemplate(modelo.conteudoTemplate).filter((t) => !TAGS_SISTEMA.includes(t));
  }, [modelo]);

  useEffect(() => {
    if (!empresaId || !modeloId || !clienteId) return;
    setGerandoPreview(true);
    const timeout = setTimeout(() => {
      preVisualizarContrato(empresaId, {
        modeloId,
        clienteId,
        valoresTagsManuais: valoresManuais,
        valorTotal: comValor && valorTotal ? Number(valorTotal) : undefined,
        quantidadeParcelas: comValor && modoParcelamento !== 'unico' ? Number(quantidadeParcelas) : undefined,
      })
        .then((r: any) => setPreview(r.conteudoRenderizado))
        .catch(() => {})
        .finally(() => setGerandoPreview(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [empresaId, modeloId, clienteId, valoresManuais, comValor, valorTotal, modoParcelamento, quantidadeParcelas]);

  async function criar() {
    if (!clienteId) {
      setErro('Selecione um cliente');
      return;
    }
    if (comValor && (!valorTotal || Number(valorTotal) <= 0)) {
      setErro('Informe um valor total maior que zero');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const resultado: any = await criarContrato(empresaId!, {
        modeloId,
        clienteId,
        titulo,
        valoresTagsManuais: valoresManuais,
        valorTotal: comValor ? Number(valorTotal) : undefined,
        parcelamento: comValor
          ? {
              modo: modoParcelamento,
              quantidadeParcelas: modoParcelamento === 'unico' ? 1 : Number(quantidadeParcelas),
              primeiroVencimento,
              intervaloDias: Number(intervaloDias),
            }
          : undefined,
      });
      showSuccess('Contrato criado com sucesso.');
      navigate(`/contratos/${resultado.id}`);
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível criar o contrato');
    } finally {
      setSalvando(false);
    }
  }

  if (!empresaId) return null;

  if (carregando) {
    return (
      <LayoutPrincipal>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <Link to="/contratos/novo" className="mb-1 flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Escolher outro modelo
      </Link>
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">Preencher: {modelo?.titulo}</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1.5">
              <Label>Título do contrato *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razaoSocial || c.nome}
                  </option>
                ))}
              </select>
            </div>

            {tagsManuais.length > 0 && (
              <div className="space-y-2 rounded-md border p-3">
                <Label className="text-xs text-muted-foreground">Tags customizadas deste modelo</Label>
                {tagsManuais.map((tag) => (
                  <div key={tag} className="space-y-1">
                    <Label className="font-mono text-xs">{`{{${tag}}}`}</Label>
                    <Input value={valoresManuais[tag] ?? ''} onChange={(e) => setValoresManuais((v) => ({ ...v, [tag]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Este contrato tem valor financeiro?</Label>
              <Switch checked={comValor} onCheckedChange={setComValor} />
            </div>

            {comValor && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Valor total *</Label>
                    <Input type="number" step="0.01" min="0.01" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <select value={modoParcelamento} onChange={(e) => setModoParcelamento(e.target.value as any)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                      <option value="unico">À vista</option>
                      <option value="parcelar">Parcelar</option>
                      <option value="repetir">Repetir valor</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>1º vencimento *</Label>
                    <Input type="date" value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} />
                  </div>
                  {modoParcelamento !== 'unico' && (
                    <div className="space-y-1.5">
                      <Label>Nº de parcelas *</Label>
                      <Input type="number" min="2" max="360" value={quantidadeParcelas} onChange={(e) => setQuantidadeParcelas(e.target.value)} />
                    </div>
                  )}
                </div>
                {modoParcelamento !== 'unico' && (
                  <div className="space-y-1.5">
                    <Label>Intervalo entre parcelas (dias) *</Label>
                    <Input type="number" min="1" max="365" value={intervaloDias} onChange={(e) => setIntervaloDias(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button className="w-full" disabled={salvando || !clienteId} onClick={criar}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar contrato
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label>Preview ao vivo</Label>
              {gerandoPreview && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {clienteId ? (
              <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">{preview || '...'}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione um cliente pra ver o preview.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutPrincipal>
  );
}
