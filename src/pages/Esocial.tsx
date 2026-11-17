import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Upload } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import SecaoLancamentosEsocial from '../components/empresas/SecaoLancamentosEsocial';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { importarRemuneracaoEsocial } from '../servicos/esocial';
import { showError, showSuccess } from '../utils/toast';

type Classificacao = 'funcionario' | 'pro_labore';

const ROTULO_CLASSIFICACAO: Record<Classificacao, string> = { funcionario: 'Funcionário (CLT)', pro_labore: 'Pró-labore (sócio)' };

interface ArquivoSelecionado {
  nome: string;
  conteudo: string;
}

interface ArquivoProcessado {
  cpfTrab: string;
  codCateg: string;
  classificacao: Classificacao | null;
  bruto: number;
  inss: number;
}

function lerArquivoComoTexto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result ?? ''));
    leitor.onerror = () => reject(new Error(`Falha ao ler ${arquivo.name}`));
    leitor.readAsText(arquivo);
  });
}

export default function Esocial() {
  const { empresaId } = useEmpresaAtiva();
  const [configAberta, setConfigAberta] = useState(false);
  const [arquivos, setArquivos] = useState<ArquivoSelecionado[]>([]);
  // Override manual por índice de arquivo -- sem entrada aqui, backend decide pelo codCateg.
  const [overrides, setOverrides] = useState<Record<number, Classificacao>>({});
  const [calculando, setCalculando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [resultado, setResultado] = useState<any | null>(null);

  function montarPayload() {
    return arquivos.map((arquivo, indice) => ({ xml: arquivo.conteudo, classificacao: overrides[indice] }));
  }

  async function calcularPreview(arquivosAtuais: ArquivoSelecionado[], overridesAtuais: Record<number, Classificacao>) {
    if (!empresaId || arquivosAtuais.length === 0) return;
    setCalculando(true);
    try {
      const dados = await importarRemuneracaoEsocial(empresaId, {
        arquivos: arquivosAtuais.map((arquivo, indice) => ({ xml: arquivo.conteudo, classificacao: overridesAtuais[indice] })),
        confirmar: false,
      });
      setPreview(dados);
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível calcular a prévia');
      setPreview(null);
    } finally {
      setCalculando(false);
    }
  }

  async function aoSelecionarArquivos(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return;
    setResultado(null);
    setOverrides({});
    const lidos = await Promise.all(
      Array.from(filesList).map(async (arquivo) => ({ nome: arquivo.name, conteudo: await lerArquivoComoTexto(arquivo) })),
    );
    setArquivos(lidos);
    // Já calcula sozinho -- é a detecção automática por codCateg, sem o usuário precisar pedir.
    calcularPreview(lidos, {});
  }

  function alterarClassificacao(indice: number, classificacao: Classificacao) {
    const novosOverrides = { ...overrides, [indice]: classificacao };
    setOverrides(novosOverrides);
    calcularPreview(arquivos, novosOverrides);
  }

  async function confirmarImportacao() {
    if (!empresaId || arquivos.length === 0) return;
    setConfirmando(true);
    try {
      const dados = await importarRemuneracaoEsocial(empresaId, { arquivos: montarPayload(), confirmar: true });
      setResultado(dados);
      setPreview(null);
      setArquivos([]);
      setOverrides({});
      showSuccess('Lançamento da folha gerado.');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível confirmar a importação');
    } finally {
      setConfirmando(false);
    }
  }

  if (!empresaId) return null;

  const arquivosProcessados: ArquivoProcessado[] = preview?.arquivos ?? [];
  const temPendente = arquivosProcessados.some((a) => a.classificacao === null);

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <Upload className="mr-2 h-6 w-6" /> eSocial -- Importar Folha (S-1200)
      </h1>

      <Card className="mb-6">
        <CardContent className="space-y-3 p-4">
          <Button type="button" variant="link" className="h-auto p-0" onClick={() => setConfigAberta((a) => !a)}>
            {configAberta ? 'Ocultar' : 'Configurar'} contas do lançamento automático
          </Button>
          {configAberta && (
            <div className="rounded-md border p-4">
              <SecaoLancamentosEsocial empresaId={empresaId} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Arquivos S-1200 (evtRemun) -- 1 por trabalhador, mesma competência</label>
            <p className="text-xs text-muted-foreground">Salário/pró-labore é identificado automaticamente pelo codCateg de cada trabalhador.</p>
            <input type="file" accept=".xml" multiple onChange={(e) => aoSelecionarArquivos(e.target.files)} className="text-sm" />
          </div>

          {calculando && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {!calculando && arquivosProcessados.length > 0 && (
            <div className="space-y-2 rounded-md border p-3">
              {arquivosProcessados.map((item, indice) => (
                <div key={item.cpfTrab + indice} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    CPF {item.cpfTrab} (categ. {item.codCateg}) -- bruto {item.bruto.toFixed(2)}
                  </span>
                  {item.classificacao ? (
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs">{ROTULO_CLASSIFICACAO[item.classificacao]}</span>
                  ) : (
                    <select
                      value=""
                      onChange={(e) => alterarClassificacao(indice, e.target.value as Classificacao)}
                      className="rounded-md border border-destructive px-2 py-1 text-xs"
                    >
                      <option value="" disabled>
                        Não identificado -- escolha
                      </option>
                      <option value="funcionario">Funcionário (CLT)</option>
                      <option value="pro_labore">Pró-labore (sócio)</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}

          {preview && (
            <div className="space-y-2 rounded-md border bg-secondary/40 p-3 text-sm">
              <p>Competência: <strong>{preview.competencia}</strong></p>
              <p>Bruto salários: <strong>{preview.brutoSalarios.toFixed(2)}</strong></p>
              <p>Bruto pró-labore: <strong>{preview.brutoProLabore.toFixed(2)}</strong></p>
              <p>INSS a recolher: <strong>{preview.totalInss.toFixed(2)}</strong></p>
              {preview.totalFgts > 0 && <p>FGTS a recolher: <strong>{preview.totalFgts.toFixed(2)}</strong></p>}
              {temPendente && <p className="text-destructive">Resolva a classificação pendente antes de confirmar.</p>}
              <Button type="button" onClick={confirmarImportacao} disabled={confirmando || temPendente} className="w-full">
                {confirmando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar e gerar lançamento
              </Button>
            </div>
          )}

          {resultado && (
            <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              {resultado.contasPagarIds.length} conta(s) a pagar gerada(s) pra competência {resultado.competencia} -- confira em Contas a Pagar.
            </p>
          )}
        </CardContent>
      </Card>
    </LayoutPrincipal>
  );
}
