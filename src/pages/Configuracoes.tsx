import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Loader2, Settings } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { atualizarComissaoHonorarios, obterComissaoHonorarios } from '../servicos/configuracoesPlataforma';
import { showError, showSuccess } from '../utils/toast';

interface DadosComissao {
  comissaoHonorariosPct: number;
}

/**
 * Deliberadamente enxuta -- não é o hub tabulado do jotaCaixa (Geral/Contábil/Plano de
 * Contas/CR/CP/Contratos/Stripe/...): a maioria dessas configurações já tem tela própria
 * dentro do módulo respectivo. Aqui só o que hoje só existe como endpoint solto.
 */
export default function Configuracoes() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const podeVer = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO'].includes(usuario?.papel);

  const [carregando, setCarregando] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<DadosComissao>();

  function carregar() {
    if (!podeVer) return;
    setCarregando(true);
    obterComissaoHonorarios()
      .then((dados) => reset(dados))
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [podeVer]);

  async function aoSalvar(dados: DadosComissao) {
    try {
      await atualizarComissaoHonorarios(Number(dados.comissaoHonorariosPct));
      showSuccess('Comissão atualizada com sucesso.');
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível atualizar a comissão');
    }
  }

  if (!usuario) return null;

  if (!podeVer) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Você não tem acesso a esta tela.</p>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <Settings className="mr-2 h-6 w-6" /> Configurações
      </h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Comissão de Honorários da Plataforma</CardTitle>
          <CardDescription>
            Percentual retido pela Jota sobre cada cobrança de honorário (contador → empresa cliente). Vale só pra
            cobranças novas -- as já emitidas mantêm o percentual congelado no momento da criação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(aoSalvar)} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register('comissaoHonorariosPct', { required: true, valueAsNumber: true, min: 0, max: 100 })}
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </LayoutPrincipal>
  );
}
