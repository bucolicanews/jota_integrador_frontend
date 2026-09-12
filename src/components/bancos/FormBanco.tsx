import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { criarBanco, atualizarBanco } from '../../servicos/bancos';
import { showSuccess } from '../../utils/toast';

interface ContaContabil {
  id: string;
  codigo: string;
  nome: string;
  sintetica: boolean;
  contaCaixaBanco: boolean;
}

interface BancoInicial {
  id: string;
  nome: string;
  contaContabilId: string;
}

interface DadosFormulario {
  nome: string;
  contaContabilId: string;
}

interface FormBancoProps {
  empresaId: string;
  contas: ContaContabil[];
  bancoInicial?: BancoInicial | null;
  onSaveComplete: () => void;
}

export default function FormBanco({ empresaId, contas, bancoInicial, onSaveComplete }: FormBancoProps) {
  const isEditing = !!bancoInicial;
  const contasElegiveis = contas.filter((c) => c.contaCaixaBanco && !c.sintetica);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      nome: bancoInicial?.nome ?? '',
      contaContabilId: bancoInicial?.contaContabilId ?? contasElegiveis[0]?.id ?? '',
    },
  });

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    try {
      if (isEditing) {
        await atualizarBanco(empresaId, bancoInicial.id, dados);
      } else {
        await criarBanco(empresaId, dados);
      }
      showSuccess(`Banco ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      onSaveComplete();
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível salvar o banco');
    }
  }

  if (contasElegiveis.length === 0) {
    return <p className="text-sm text-muted-foreground">Marque ao menos uma conta como "Caixa/Banco" no Plano de Contas antes de cadastrar um banco.</p>;
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input placeholder="Ex: Banco Cora, Caixa Loja 1" {...register('nome', { required: true, minLength: 1 })} />
        {errors.nome && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Conta contábil (Caixa/Banco) *</Label>
        <select {...register('contaContabilId', { required: true })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {contasElegiveis.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} — {c.nome}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">O saldo exibido é sempre calculado a partir dos lançamentos desta conta.</p>
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar banco'}
      </Button>
    </form>
  );
}
