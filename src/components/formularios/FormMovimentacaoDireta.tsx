import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { criarLancamento } from '../../servicos/lancamentos';
import { showError, showSuccess } from '../../utils/toast';

interface Conta {
  id: string;
  codigo: string;
  nome: string;
  sintetica: boolean;
  ativa: boolean;
  contaCaixaBanco: boolean;
}

interface DadosFormulario {
  tipo: 'entrada' | 'saida';
  contaCaixaBancoId: string;
  contraContaId: string;
  valor: string;
  historico: string;
  dataCompetencia: string;
}

interface FormMovimentacaoDiretaProps {
  empresaId: string;
  contas: Conta[];
  onSaveComplete: () => void;
}

/** Registro rápido de entrada/saída de caixa/banco -- por baixo dos panos continua sendo um lançamento em partida dobrada normal (mesmo `criarLancamento` que o formulário completo usa), só com a conta caixa/banco pré-selecionada e o usuário escolhendo só a contrapartida. */
export default function FormMovimentacaoDireta({ empresaId, contas, onSaveComplete }: FormMovimentacaoDiretaProps) {
  const contasCaixaBanco = contas.filter((c) => c.contaCaixaBanco && !c.sintetica && c.ativa);
  const contasAnaliticas = contas.filter((c) => !c.sintetica && c.ativa);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DadosFormulario>({
    defaultValues: {
      tipo: 'entrada',
      contaCaixaBancoId: contasCaixaBanco[0]?.id ?? '',
      contraContaId: '',
      valor: '',
      historico: '',
      dataCompetencia: new Date().toISOString().slice(0, 10),
    },
  });

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    try {
      const valor = Number(dados.valor);
      // Entrada (reforço de caixa): débito na conta caixa/banco, crédito na contrapartida.
      // Saída (sangria): crédito na conta caixa/banco, débito na contrapartida.
      const partidas =
        dados.tipo === 'entrada'
          ? [
              { contaId: dados.contaCaixaBancoId, tipo: 'debito', valor },
              { contaId: dados.contraContaId, tipo: 'credito', valor },
            ]
          : [
              { contaId: dados.contaCaixaBancoId, tipo: 'credito', valor },
              { contaId: dados.contraContaId, tipo: 'debito', valor },
            ];

      await criarLancamento(empresaId, {
        dataCompetencia: dados.dataCompetencia,
        historico: dados.historico,
        documentoReferencia: null,
        origem: 'manual',
        partidas,
      });
      showSuccess('Movimentação registrada.');
      reset();
      onSaveComplete();
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível registrar a movimentação');
    }
  }

  if (contasCaixaBanco.length === 0) {
    return <p className="text-sm text-muted-foreground">Marque ao menos uma conta como "Caixa/Banco" no Plano de Contas antes de registrar movimentações diretas.</p>;
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input type="radio" value="entrada" {...register('tipo')} /> Entrada (reforço)
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input type="radio" value="saida" {...register('tipo')} /> Saída (sangria)
        </label>
      </div>

      <div className="space-y-1.5">
        <Label>Conta caixa/banco *</Label>
        <select {...register('contaCaixaBancoId', { required: true })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {contasCaixaBanco.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Contrapartida *</Label>
        <select {...register('contraContaId', { required: true })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Selecione...</option>
          {contasAnaliticas
            .filter((c) => !c.contaCaixaBanco)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
        </select>
        {errors.contraContaId && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" {...register('dataCompetencia', { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>Valor *</Label>
          <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...register('valor', { required: true, min: 0.01 })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Histórico *</Label>
        <Input placeholder="Ex: Sangria pra depósito bancário" {...register('historico', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })} />
        {errors.historico && <p className="text-xs text-destructive">{errors.historico.message}</p>}
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? 'Salvando...' : 'Registrar movimentação'}
      </Button>
    </form>
  );
}
