import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { criarContaReceber } from '../../servicos/contasAReceber';
import { showSuccess } from '../../utils/toast';

interface Conta {
  id: string;
  codigo: string;
  nome: string;
  grupo: string;
  sintetica: boolean;
  contaAReceber: boolean;
}

interface Cliente {
  id: string;
  nome: string;
  razaoSocial: string | null;
}

interface DadosFormulario {
  clienteId: string;
  clienteNome: string;
  descricao: string;
  contaPatrimonialId: string;
  contaResultadoId: string;
  dataEmissao: string;
  modo: 'unico' | 'parcelar' | 'repetir';
  valor: string;
  quantidadeParcelas: string;
  primeiroVencimento: string;
  intervaloDias: string;
}

interface FormNovaContaReceberProps {
  empresaId: string;
  contas: Conta[];
  clientes: Cliente[];
  onSaveComplete: () => void;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export default function FormNovaContaReceber({ empresaId, contas, clientes, onSaveComplete }: FormNovaContaReceberProps) {
  const contasPatrimoniais = contas.filter((c) => c.contaAReceber && !c.sintetica);
  const contasResultado = contas.filter((c) => !c.sintetica && c.grupo === 'receita');
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      clienteId: '',
      clienteNome: '',
      descricao: '',
      contaPatrimonialId: contasPatrimoniais[0]?.id ?? '',
      contaResultadoId: '',
      dataEmissao: hoje(),
      modo: 'unico',
      valor: '',
      quantidadeParcelas: '2',
      primeiroVencimento: hoje(),
      intervaloDias: '30',
    },
  });

  const modo = watch('modo');
  const clienteId = watch('clienteId');

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    const clienteSelecionado = clientes.find((c) => c.id === dados.clienteId);
    const nomeCliente = clienteSelecionado ? clienteSelecionado.razaoSocial || clienteSelecionado.nome : dados.clienteNome;
    if (!nomeCliente) {
      setErroGeral('Selecione um cliente cadastrado ou digite o nome.');
      return;
    }
    try {
      await criarContaReceber(empresaId, {
        clienteId: dados.clienteId || undefined,
        clienteNome: nomeCliente,
        descricao: dados.descricao,
        contaPatrimonialId: dados.contaPatrimonialId,
        contaResultadoId: dados.contaResultadoId,
        dataEmissao: dados.dataEmissao,
        modo: dados.modo,
        valor: Number(dados.valor),
        quantidadeParcelas: dados.modo === 'unico' ? 1 : Number(dados.quantidadeParcelas),
        primeiroVencimento: dados.primeiroVencimento,
        intervaloDias: Number(dados.intervaloDias),
      });
      showSuccess('Conta a receber criada com sucesso.');
      onSaveComplete();
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível criar a conta a receber');
    }
  }

  if (contasPatrimoniais.length === 0) {
    return <p className="text-sm text-muted-foreground">Marque ao menos uma conta como "Conta a Receber" no Plano de Contas antes de lançar.</p>;
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Cliente *</Label>
        <select {...register('clienteId')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Cliente novo (digitar nome abaixo)</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razaoSocial || c.nome}
            </option>
          ))}
        </select>
        {!clienteId && (
          <>
            <Input placeholder="Nome do cliente" className="mt-1.5" {...register('clienteNome', { required: !clienteId, minLength: 1 })} />
            {errors.clienteNome && <p className="text-xs text-destructive">Obrigatório</p>}
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Descrição *</Label>
        <Input placeholder="Ex: Venda de serviço" {...register('descricao', { required: true, minLength: 1 })} />
        {errors.descricao && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Conta patrimonial (Ativo) *</Label>
          <select {...register('contaPatrimonialId', { required: true })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {contasPatrimoniais.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Conta de receita (Resultado) *</Label>
          <select {...register('contaResultadoId', { required: true })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Selecione...</option>
            {contasResultado.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </select>
          {errors.contaResultadoId && <p className="text-xs text-destructive">Obrigatório</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Data de emissão *</Label>
        <Input type="date" {...register('dataEmissao', { required: true })} />
      </div>

      <div className="space-y-1.5 rounded-md border p-3">
        <Label>Tipo de lançamento</Label>
        <div className="flex flex-wrap gap-3 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" value="unico" {...register('modo')} /> Único
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" value="repetir" {...register('modo')} /> Repetir valor
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="radio" value="parcelar" {...register('modo')} /> Parcelar valor
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{modo === 'parcelar' ? 'Valor total *' : 'Valor da parcela *'}</Label>
          <Input type="number" step="0.01" min="0.01" placeholder="0,00" {...register('valor', { required: true, min: 0.01 })} />
        </div>
        <div className="space-y-1.5">
          <Label>{modo === 'unico' ? 'Vencimento *' : '1º vencimento *'}</Label>
          <Input type="date" {...register('primeiroVencimento', { required: true })} />
        </div>
      </div>

      {modo !== 'unico' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nº de parcelas *</Label>
            <Input type="number" min="2" max="360" {...register('quantidadeParcelas', { required: true, min: 2 })} />
          </div>
          <div className="space-y-1.5">
            <Label>Intervalo (dias) *</Label>
            <Input type="number" min="1" max="365" {...register('intervaloDias', { required: true, min: 1 })} />
          </div>
        </div>
      )}

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar conta a receber
      </Button>
    </form>
  );
}
