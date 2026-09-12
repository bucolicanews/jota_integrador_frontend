import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { criarHistorico, atualizarHistorico } from '../../servicos/historicos';
import { showSuccess } from '../../utils/toast';

interface Historico {
  id: string;
  codigo: string | null;
  descricao: string;
}

interface DadosFormulario {
  codigo: string;
  descricao: string;
}

interface FormHistoricoProps {
  empresaId: string;
  historicoInicial?: Historico | null;
  onSaveComplete: () => void;
}

export default function FormHistorico({ empresaId, historicoInicial, onSaveComplete }: FormHistoricoProps) {
  const isEditing = !!historicoInicial;
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      codigo: historicoInicial?.codigo ?? '',
      descricao: historicoInicial?.descricao ?? '',
    },
  });

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    const payload = { codigo: dados.codigo || null, descricao: dados.descricao };
    try {
      if (isEditing) {
        await atualizarHistorico(empresaId, historicoInicial.id, payload);
      } else {
        await criarHistorico(empresaId, payload);
      }
      showSuccess(`Histórico ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      onSaveComplete();
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível salvar o histórico');
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Código (opcional)</Label>
        <Input maxLength={20} placeholder="Ex: 001" {...register('codigo')} />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição *</Label>
        <Input placeholder="Ex: Pagamento de fornecedor" {...register('descricao', { required: true, minLength: 2 })} />
        {errors.descricao && <p className="text-xs text-destructive">Obrigatório (mínimo 2 caracteres)</p>}
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar histórico'}
      </Button>
    </form>
  );
}
