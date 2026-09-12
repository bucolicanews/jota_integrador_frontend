import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { criarConfiguracao, atualizarConfiguracao } from '../../servicos/conciliacaoBancaria';
import { showError, showSuccess } from '../../utils/toast';

interface ConfiguracaoConciliacao {
  id: string;
  contaContabilId: string;
  nomeConfiguracao: string;
  mapeamento: { data: string; descricao: string; valor?: string | null; credito?: string | null; debito?: string | null; identificacao?: string | null };
  colunaTipoTransacao: string | null;
  valorCredito: string | null;
}

interface DadosFormulario {
  nomeConfiguracao: string;
  colunaData: string;
  colunaDescricao: string;
  colunaIdentificacao: string;
  colunaValor: string;
  colunaTipoTransacao: string;
  valorCredito: string;
  colunaCredito: string;
  colunaDebito: string;
}

interface FormConfiguracaoConciliacaoProps {
  empresaId: string;
  contaContabilId: string;
  configInicial?: ConfiguracaoConciliacao | null;
  onSaveComplete: () => void;
}

/** Duas formas de identificar o sinal da transação no CSV -- ou uma coluna de valor único (com coluna de tipo/palavra de crédito opcional), ou colunas separadas de crédito e débito. Usa uma ou outra, nunca as duas (mesma regra do backend, `MapeamentoColunasExtrato`). */
export default function FormConfiguracaoConciliacao({ empresaId, contaContabilId, configInicial, onSaveComplete }: FormConfiguracaoConciliacaoProps) {
  const isEditing = !!configInicial;
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      nomeConfiguracao: configInicial?.nomeConfiguracao ?? '',
      colunaData: configInicial?.mapeamento?.data ?? 'Data',
      colunaDescricao: configInicial?.mapeamento?.descricao ?? 'Descrição',
      colunaIdentificacao: configInicial?.mapeamento?.identificacao ?? '',
      colunaValor: configInicial?.mapeamento?.valor ?? '',
      colunaTipoTransacao: configInicial?.colunaTipoTransacao ?? '',
      valorCredito: configInicial?.valorCredito ?? '',
      colunaCredito: configInicial?.mapeamento?.credito ?? '',
      colunaDebito: configInicial?.mapeamento?.debito ?? '',
    },
  });

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);

    const temValorUnico = !!dados.colunaValor;
    const temCreditoDebito = !!dados.colunaCredito && !!dados.colunaDebito;
    if (!temValorUnico && !temCreditoDebito) {
      setErroGeral('Preencha a "Coluna de Valor" ou as duas colunas "Crédito"/"Débito".');
      return;
    }
    if (temValorUnico && (dados.colunaCredito || dados.colunaDebito)) {
      setErroGeral('Use apenas a "Coluna de Valor" OU as colunas de Crédito/Débito, não as duas.');
      return;
    }

    const payload = {
      contaContabilId,
      nomeConfiguracao: dados.nomeConfiguracao,
      mapeamento: {
        data: dados.colunaData,
        descricao: dados.colunaDescricao,
        valor: dados.colunaValor || null,
        credito: dados.colunaCredito || null,
        debito: dados.colunaDebito || null,
        identificacao: dados.colunaIdentificacao || null,
      },
      colunaTipoTransacao: dados.colunaTipoTransacao || null,
      valorCredito: dados.valorCredito || null,
    };

    try {
      if (isEditing) {
        await atualizarConfiguracao(empresaId, configInicial.id, payload);
      } else {
        await criarConfiguracao(empresaId, payload);
      }
      showSuccess('Configuração salva com sucesso.');
      onSaveComplete();
    } catch (erro: any) {
      setErroGeral(erro.message ?? 'Não foi possível salvar a configuração');
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome da configuração *</Label>
        <Input placeholder="Ex: Extrato Banco Cora" {...register('nomeConfiguracao', { required: true, minLength: 2 })} />
        {errors.nomeConfiguracao && <p className="text-xs text-destructive">Obrigatório (mínimo 2 caracteres)</p>}
      </div>

      <h4 className="border-t pt-3 text-sm font-semibold">Mapeamento de colunas essenciais (CSV)</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Coluna de Data *</Label>
          <Input placeholder="Data" {...register('colunaData', { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>Coluna de Descrição *</Label>
          <Input placeholder="Transação" {...register('colunaDescricao', { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>Coluna de Identificação</Label>
          <Input placeholder="Documento" {...register('colunaIdentificacao')} />
        </div>
      </div>

      <Separator />

      <h4 className="text-sm font-semibold">Modo 1: coluna de valor único</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Coluna de Valor</Label>
          <Input placeholder="Valor" {...register('colunaValor')} />
        </div>
        <div className="space-y-1.5">
          <Label>Coluna de Tipo (opcional)</Label>
          <Input placeholder="Tipo Transação" {...register('colunaTipoTransacao')} />
        </div>
        <div className="space-y-1.5">
          <Label>Valor para Crédito (opcional)</Label>
          <Input placeholder="CRÉDITO" {...register('valorCredito')} />
        </div>
      </div>

      <Separator />

      <h4 className="text-sm font-semibold">Modo 2: colunas de crédito e débito separadas</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Coluna de Crédito</Label>
          <Input placeholder="Crédito (R$)" {...register('colunaCredito')} />
        </div>
        <div className="space-y-1.5">
          <Label>Coluna de Débito</Label>
          <Input placeholder="Débito (R$)" {...register('colunaDebito')} />
        </div>
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar configuração
      </Button>
    </form>
  );
}
