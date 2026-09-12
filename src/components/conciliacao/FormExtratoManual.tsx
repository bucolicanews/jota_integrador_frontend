import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { registrarExtratoManual } from '../../servicos/conciliacaoBancaria';
import { listarDescricoesExtrato } from '../../servicos/descricoesExtrato';
import { listarIdentificadoresExtrato } from '../../servicos/identificadoresExtrato';
import { showSuccess } from '../../utils/toast';

interface Conta {
  id: string;
  codigo: string;
  nome: string;
  grupo: string;
  sintetica: boolean;
  contaCaixaBanco: boolean;
}

interface DadosFormulario {
  tipo: 'Entrada' | 'Saida';
  contaContabilId: string;
  contaContabilResultadoId: string;
  valor: string;
  dataCompetencia: string;
  descricao: string;
  identificacao: string;
}

interface FormExtratoManualProps {
  empresaId: string;
  contasCaixaBanco: Conta[];
  contasPlano: Conta[];
  onSaveComplete: () => void;
}

const hoje = () => new Date().toISOString().slice(0, 10);

/** Equivalente ao "Extrato Direto" do jotaCaixa (FormExtratoDireto) -- registra uma movimentação de caixa/banco sem importar CSV, já gravando como conciliada. Diferente de FormMovimentacaoDireta (Fluxo de Caixa): esta grava também em conciliacao_transacoes, então uma importação de CSV futura reconhece a mesma linha e não duplica. */
export default function FormExtratoManual({ empresaId, contasCaixaBanco, contasPlano, onSaveComplete }: FormExtratoManualProps) {
  const [descricoesSugeridas, setDescricoesSugeridas] = useState<any[]>([]);
  const [identificadoresSugeridos, setIdentificadoresSugeridos] = useState<any[]>([]);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    listarDescricoesExtrato(empresaId).then(setDescricoesSugeridas).catch(() => {});
    listarIdentificadoresExtrato(empresaId).then(setIdentificadoresSugeridos).catch(() => {});
  }, [empresaId]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      tipo: 'Entrada',
      contaContabilId: contasCaixaBanco[0]?.id ?? '',
      contaContabilResultadoId: '',
      valor: '',
      dataCompetencia: hoje(),
      descricao: '',
      identificacao: '',
    },
  });

  const tipo = watch('tipo');
  const contasResultado = contasPlano.filter((c) => !c.sintetica && !c.contaCaixaBanco && (tipo === 'Entrada' ? c.grupo === 'receita' : c.grupo === 'despesa' || c.grupo === 'custo'));

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    try {
      await registrarExtratoManual(empresaId, {
        contaContabilId: dados.contaContabilId,
        contaContabilResultadoId: dados.contaContabilResultadoId,
        tipo: dados.tipo,
        valor: Number(dados.valor),
        dataCompetencia: dados.dataCompetencia,
        descricao: dados.descricao,
        identificacao: dados.identificacao || undefined,
      });
      showSuccess('Movimentação registrada e conciliada com sucesso.');
      onSaveComplete();
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível registrar a movimentação');
    }
  }

  if (contasCaixaBanco.length === 0) {
    return <p className="text-sm text-muted-foreground">Marque ao menos uma conta como "Caixa/Banco" no Plano de Contas antes de lançar um extrato manual.</p>;
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input type="radio" value="Entrada" {...register('tipo')} /> Entrada
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input type="radio" value="Saida" {...register('tipo')} /> Saída
        </label>
      </div>

      <div className="space-y-1.5">
        <Label>Conta bancária *</Label>
        <select {...register('contaContabilId', { required: true })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {contasCaixaBanco.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Valor *</Label>
          <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...register('valor', { required: true, min: 0.01 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" {...register('dataCompetencia', { required: true })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descrição do extrato *</Label>
        <Input list="descricoes-extrato-sugestoes" placeholder="Ex: Recebimento PIX Cliente X" {...register('descricao', { required: true, minLength: 1 })} />
        <datalist id="descricoes-extrato-sugestoes">
          {descricoesSugeridas.map((d) => (
            <option key={d.id} value={d.descricao} />
          ))}
        </datalist>
        {errors.descricao && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Identificação (opcional)</Label>
        <Input list="identificadores-extrato-sugestoes" placeholder="Ex: NF 123" {...register('identificacao')} />
        <datalist id="identificadores-extrato-sugestoes">
          {identificadoresSugeridos.map((i) => (
            <option key={i.id} value={i.descricao} />
          ))}
        </datalist>
      </div>

      <div className="space-y-1.5">
        <Label>Conta de contrapartida *</Label>
        <select {...register('contaContabilResultadoId', { required: true })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Selecione...</option>
          {contasResultado.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nome}
            </option>
          ))}
        </select>
        {errors.contaContabilResultadoId && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Registrar e conciliar
      </Button>
    </form>
  );
}
