import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Settings2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarPlanoContas } from '../servicos/planoContas';
import { obterConfiguracaoContratos, salvarConfiguracaoContratos } from '../servicos/contratos';
import { showError, showSuccess } from '../utils/toast';

interface ContaContabil {
  id: string;
  codigo: string;
  nome: string;
  grupo: string;
  sintetica: boolean;
  ativa: boolean;
}

interface DadosFormulario {
  contaPatrimonialReceberId: string;
  contaResultadoReceitaId: string;
  contaPatrimonialPagarId: string;
  contaResultadoDespesaId: string;
  urlBaseAssinatura: string;
}

/** Combo de conta contábil -- só analítica, grupo certo, ativa. Mesmo padrão de filtro de FormBanco/FormNovaContaReceber/FormNovaContaPagar: sintética nunca entra num select de lançamento, só agrupa outras contas. */
function SeletorConta({ rotulo, ajuda, contas, vazio, register, campo }: {
  rotulo: string;
  ajuda: string;
  contas: ContaContabil[];
  vazio: string;
  register: ReturnType<typeof useForm<DadosFormulario>>['register'];
  campo: keyof DadosFormulario;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{rotulo}</Label>
      {contas.length === 0 ? (
        <p className="text-xs text-muted-foreground">{vazio}</p>
      ) : (
        <>
          <select {...register(campo)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— Não configurado —</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{ajuda}</p>
        </>
      )}
    </div>
  );
}

export default function ContratoConfiguracao() {
  const { empresaId } = useEmpresaAtiva();
  const [contas, setContas] = useState<ContaContabil[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      contaPatrimonialReceberId: '',
      contaResultadoReceitaId: '',
      contaPatrimonialPagarId: '',
      contaResultadoDespesaId: '',
      urlBaseAssinatura: '',
    },
  });

  useEffect(() => {
    if (!empresaId) return;
    setCarregando(true);
    Promise.all([listarPlanoContas(empresaId), obterConfiguracaoContratos(empresaId)])
      .then(([listaContas, config]) => {
        setContas(listaContas);
        reset({
          contaPatrimonialReceberId: config?.contaPatrimonialReceberId ?? '',
          contaResultadoReceitaId: config?.contaResultadoReceitaId ?? '',
          contaPatrimonialPagarId: config?.contaPatrimonialPagarId ?? '',
          contaResultadoDespesaId: config?.contaResultadoDespesaId ?? '',
          urlBaseAssinatura: config?.urlBaseAssinatura ?? '',
        });
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }, [empresaId, reset]);

  const analiticasAtivas = contas.filter((c) => !c.sintetica && c.ativa !== false);
  const contasReceber = analiticasAtivas.filter((c) => c.grupo === 'ativo');
  const contasReceita = analiticasAtivas.filter((c) => c.grupo === 'receita');
  const contasPagar = analiticasAtivas.filter((c) => c.grupo === 'passivo');
  const contasDespesa = analiticasAtivas.filter((c) => c.grupo === 'despesa');

  async function aoSubmeter(dados: DadosFormulario) {
    if (!empresaId) return;
    setErroGeral(null);
    try {
      await salvarConfiguracaoContratos(empresaId, {
        contaPatrimonialReceberId: dados.contaPatrimonialReceberId || undefined,
        contaResultadoReceitaId: dados.contaResultadoReceitaId || undefined,
        contaPatrimonialPagarId: dados.contaPatrimonialPagarId || undefined,
        contaResultadoDespesaId: dados.contaResultadoDespesaId || undefined,
        urlBaseAssinatura: dados.urlBaseAssinatura || undefined,
      });
      showSuccess('Configuração de contratos salva.');
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível salvar a configuração');
    }
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6">
        <Link to="/contratos" className="mb-1 flex items-center text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar pra Contratos
        </Link>
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <Settings2 className="mr-2 h-6 w-6" /> Configuração de Contratos
        </h1>
      </div>

      {carregando ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lado credor -- contrato com cliente</CardTitle>
              <CardDescription>Usadas quando este contrato gera uma conta a receber (contrato com valor e cliente vinculado).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SeletorConta
                rotulo="Conta patrimonial a receber *"
                ajuda="Débito do lançamento de competência -- normalmente uma conta de Clientes a Receber."
                contas={contasReceber}
                vazio="Nenhuma conta analítica do grupo Ativo. Cadastre uma em Plano de Contas antes de configurar aqui."
                register={register}
                campo="contaPatrimonialReceberId"
              />
              <SeletorConta
                rotulo="Conta de receita *"
                ajuda="Crédito do lançamento de competência -- a receita que o contrato representa."
                contas={contasReceita}
                vazio="Nenhuma conta analítica do grupo Receita. Cadastre uma em Plano de Contas antes de configurar aqui."
                register={register}
                campo="contaResultadoReceitaId"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lado devedor -- contrato entre empresas</CardTitle>
              <CardDescription>Usadas quando esta empresa é a contraparte que paga, num contrato entre duas empresas (sem cliente).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SeletorConta
                rotulo="Conta patrimonial a pagar"
                ajuda="Crédito do lançamento de competência -- normalmente uma conta de Fornecedores a Pagar."
                contas={contasPagar}
                vazio="Nenhuma conta analítica do grupo Passivo. Cadastre uma em Plano de Contas antes de configurar aqui."
                register={register}
                campo="contaPatrimonialPagarId"
              />
              <SeletorConta
                rotulo="Conta de despesa"
                ajuda="Débito do lançamento de competência -- a despesa que o contrato representa."
                contas={contasDespesa}
                vazio="Nenhuma conta analítica do grupo Despesa. Cadastre uma em Plano de Contas antes de configurar aqui."
                register={register}
                campo="contaResultadoDespesaId"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assinatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Label>URL base de assinatura</Label>
              <Input placeholder="https://..." {...register('urlBaseAssinatura')} />
              <p className="text-xs text-muted-foreground">Base usada ao gerar o link público de assinatura do contrato. Deixe em branco pra usar o padrão da plataforma.</p>
            </CardContent>
          </Card>

          {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar configuração
          </Button>
        </form>
      )}
    </LayoutPrincipal>
  );
}
