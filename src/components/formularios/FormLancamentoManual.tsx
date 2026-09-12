import { useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { criarLancamento } from '../../servicos/lancamentos';
import { showError, showSuccess } from '../../utils/toast';

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

interface Conta {
  id: string;
  codigo: string;
  nome: string;
  sintetica: boolean;
  ativa: boolean;
}

interface Historico {
  id: string;
  descricao: string;
}

interface FormLancamentoManualProps {
  empresaId: string;
  contas: Conta[];
  historicos: Historico[];
  onSaveComplete: () => void;
}

interface CampoPartida {
  contaId: string;
  tipo: 'debito' | 'credito';
  valor: string;
}

interface DadosFormulario {
  dataCompetencia: string;
  historico: string;
  documentoReferencia: string;
  partidas: CampoPartida[];
}

export default function FormLancamentoManual({ empresaId, contas, historicos, onSaveComplete }: FormLancamentoManualProps) {
  const contasAnaliticas = contas.filter((c) => !c.sintetica && c.ativa);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<DadosFormulario>({
    defaultValues: {
      dataCompetencia: new Date().toISOString().slice(0, 10),
      historico: '',
      documentoReferencia: '',
      partidas: [
        { contaId: contasAnaliticas[0]?.id ?? '', tipo: 'debito', valor: '' },
        { contaId: contasAnaliticas[0]?.id ?? '', tipo: 'credito', valor: '' },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'partidas' });
  const partidasAtuais = watch('partidas');

  const { totalDebito, totalCredito } = useMemo(() => {
    let debito = 0;
    let credito = 0;
    for (const partida of partidasAtuais ?? []) {
      const valor = Number(partida.valor) || 0;
      if (partida.tipo === 'debito') debito += valor;
      else credito += valor;
    }
    return { totalDebito: debito, totalCredito: credito };
  }, [partidasAtuais]);
  const fecha = totalDebito > 0 && totalDebito === totalCredito;

  async function aoSubmeter(dados: DadosFormulario) {
    try {
      await criarLancamento(empresaId, {
        dataCompetencia: dados.dataCompetencia,
        historico: dados.historico,
        documentoReferencia: dados.documentoReferencia || null,
        origem: 'manual',
        partidas: dados.partidas.map((p) => ({ contaId: p.contaId, tipo: p.tipo, valor: Number(p.valor) })),
      });
      showSuccess('Lançamento registrado com sucesso.');
      reset();
      onSaveComplete();
    } catch (erro: any) {
      const mensagem = erro?.message ?? 'Não foi possível criar o lançamento';
      setError('root', { message: mensagem });
      showError(mensagem);
    }
  }

  if (contasAnaliticas.length < 2) {
    return <p className="text-sm text-muted-foreground">Cadastre ao menos 2 contas analíticas no plano de contas antes de lançar.</p>;
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" {...register('dataCompetencia', { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>Documento de referência</Label>
          <Input {...register('documentoReferencia')} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Histórico *</Label>
        <Input
          list="historicos-sugeridos"
          placeholder="Ex: Pagamento de salário"
          {...register('historico', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })}
        />
        <datalist id="historicos-sugeridos">
          {historicos.map((h) => (
            <option key={h.id} value={h.descricao} />
          ))}
        </datalist>
        {errors.historico && <p className="text-xs text-destructive">{errors.historico.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Partidas *</Label>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => append({ contaId: contasAnaliticas[0]?.id ?? '', tipo: 'debito', valor: '' })}
          >
            + Adicionar partida
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Controller
                control={control}
                name={`partidas.${index}.contaId`}
                rules={{ required: true }}
                render={({ field: campo }) => (
                  <Select value={campo.value} onValueChange={campo.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasAnaliticas.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.codigo} — {conta.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <select {...register(`partidas.${index}.tipo`)} className="h-10 w-28 rounded-md border border-input bg-background px-2 text-sm">
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
            </select>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              className="w-28"
              {...register(`partidas.${index}.valor`, { required: true, min: 0.01 })}
            />
            <Button type="button" variant="ghost" size="icon" disabled={fields.length <= 2} onClick={() => remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <p className={`text-sm font-medium ${fecha ? 'text-green-700' : 'text-destructive'}`}>
          Débito: {formatarMoeda(totalDebito)} · Crédito: {formatarMoeda(totalCredito)} {fecha ? '✓ fecha' : '— precisa fechar antes de salvar'}
        </p>
      </div>

      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting || !fecha}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isSubmitting ? 'Salvando...' : 'Salvar lançamento'}
      </Button>
    </form>
  );
}
