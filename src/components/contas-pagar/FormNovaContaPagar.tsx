import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { criarContaPagar } from '../../servicos/contasAPagar';
import { showSuccess } from '../../utils/toast';

interface Conta {
  id: string;
  codigo: string;
  nome: string;
  grupo: string;
  sintetica: boolean;
  contaAPagar: boolean;
}

interface Fornecedor {
  id: string;
  nome: string;
  razaoSocial: string | null;
}

interface DadosFormulario {
  fornecedorId: string;
  fornecedor: string;
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

interface FormNovaContaPagarProps {
  empresaId: string;
  contas: Conta[];
  fornecedores: Fornecedor[];
  onSaveComplete: () => void;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export default function FormNovaContaPagar({ empresaId, contas, fornecedores, onSaveComplete }: FormNovaContaPagarProps) {
  const contasPatrimoniais = contas.filter((c) => c.contaAPagar && !c.sintetica);
  const contasResultado = contas.filter((c) => !c.sintetica && (c.grupo === 'despesa' || c.grupo === 'custo'));
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      fornecedorId: '',
      fornecedor: '',
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
  const fornecedorId = watch('fornecedorId');

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    const fornecedorSelecionado = fornecedores.find((f) => f.id === dados.fornecedorId);
    const nomeFornecedor = fornecedorSelecionado ? fornecedorSelecionado.razaoSocial || fornecedorSelecionado.nome : dados.fornecedor;
    if (!nomeFornecedor) {
      setErroGeral('Selecione um fornecedor cadastrado ou digite o nome.');
      return;
    }
    try {
      await criarContaPagar(empresaId, {
        fornecedorId: dados.fornecedorId || undefined,
        fornecedor: nomeFornecedor,
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
      showSuccess('Conta a pagar criada com sucesso.');
      onSaveComplete();
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível criar a conta a pagar');
    }
  }

  if (contasPatrimoniais.length === 0) {
    return <p className="text-sm text-muted-foreground">Marque ao menos uma conta como "Conta a Pagar" no Plano de Contas antes de lançar.</p>;
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Fornecedor *</Label>
        <select {...register('fornecedorId')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Fornecedor novo (digitar nome abaixo)</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.razaoSocial || f.nome}
            </option>
          ))}
        </select>
        {!fornecedorId && (
          <>
            <Input placeholder="Nome do fornecedor" className="mt-1.5" {...register('fornecedor', { required: !fornecedorId, minLength: 1 })} />
            {errors.fornecedor && <p className="text-xs text-destructive">Obrigatório</p>}
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Descrição *</Label>
        <Input placeholder="Ex: Aluguel de setembro" {...register('descricao', { required: true, minLength: 1 })} />
        {errors.descricao && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Conta patrimonial (Passivo) *</Label>
          <select {...register('contaPatrimonialId', { required: true })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {contasPatrimoniais.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Conta de despesa (Resultado) *</Label>
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
        Salvar conta a pagar
      </Button>
    </form>
  );
}
