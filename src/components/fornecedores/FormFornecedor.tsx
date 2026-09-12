import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { criarFornecedor, atualizarFornecedor } from '../../servicos/fornecedores';
import { showSuccess } from '../../utils/toast';

interface Fornecedor {
  id: string;
  nome: string;
  razaoSocial: string | null;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
}

interface DadosFormulario {
  nome: string;
  razaoSocial: string;
  documento: string;
  email: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface FormFornecedorProps {
  empresaId: string;
  fornecedorInicial?: Fornecedor | null;
  onSaveComplete: () => void;
}

export default function FormFornecedor({ empresaId, fornecedorInicial, onSaveComplete }: FormFornecedorProps) {
  const isEditing = !!fornecedorInicial;
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      nome: fornecedorInicial?.nome ?? '',
      razaoSocial: fornecedorInicial?.razaoSocial ?? '',
      documento: fornecedorInicial?.documento ?? '',
      email: fornecedorInicial?.email ?? '',
      telefone: fornecedorInicial?.telefone ?? '',
      cep: fornecedorInicial?.cep ?? '',
      endereco: fornecedorInicial?.endereco ?? '',
      numero: fornecedorInicial?.numero ?? '',
      complemento: fornecedorInicial?.complemento ?? '',
      bairro: fornecedorInicial?.bairro ?? '',
      cidade: fornecedorInicial?.cidade ?? '',
      estado: fornecedorInicial?.estado ?? '',
    },
  });

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    const payload = {
      nome: dados.nome,
      razaoSocial: dados.razaoSocial || null,
      documento: dados.documento || null,
      email: dados.email || null,
      telefone: dados.telefone || null,
      cep: dados.cep || null,
      endereco: dados.endereco || null,
      numero: dados.numero || null,
      complemento: dados.complemento || null,
      bairro: dados.bairro || null,
      cidade: dados.cidade || null,
      estado: dados.estado || null,
    };
    try {
      if (isEditing) {
        await atualizarFornecedor(empresaId, fornecedorInicial.id, payload);
      } else {
        await criarFornecedor(empresaId, payload);
      }
      showSuccess(`Fornecedor ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      onSaveComplete();
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível salvar o fornecedor');
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input {...register('nome', { required: true, minLength: 1 })} />
          {errors.nome && <p className="text-xs text-destructive">Obrigatório</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Razão social</Label>
          <Input {...register('razaoSocial')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>CPF/CNPJ</Label>
          <Input {...register('documento')} />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input type="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">E-mail inválido</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Telefone</Label>
          <Input {...register('telefone')} />
        </div>
      </div>

      <Separator />
      <p className="text-sm font-semibold">Endereço (opcional)</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>CEP</Label>
          <Input {...register('cep')} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Endereço</Label>
          <Input {...register('endereco')} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Número</Label>
          <Input {...register('numero')} />
        </div>
        <div className="space-y-1.5">
          <Label>Complemento</Label>
          <Input {...register('complemento')} />
        </div>
        <div className="space-y-1.5">
          <Label>Bairro</Label>
          <Input {...register('bairro')} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Cidade</Label>
          <Input {...register('cidade')} />
        </div>
        <div className="space-y-1.5">
          <Label>UF</Label>
          <Input maxLength={2} {...register('estado')} />
        </div>
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar fornecedor'}
      </Button>
    </form>
  );
}
