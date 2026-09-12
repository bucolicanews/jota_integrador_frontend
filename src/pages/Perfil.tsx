import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { KeyRound, Loader2, UserCog } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '../servicos/supabase';
import { obterMeuPerfil, atualizarMeuNome } from '../servicos/perfil';
import { showError, showSuccess } from '../utils/toast';

const ROTULO_PAPEL: Record<string, string> = {
  SUPER_ADMIN: 'Administrador da plataforma',
  ADMIN_FINANCEIRO: 'Administrador financeiro',
  ADMIN_SUPORTE: 'Administrador de suporte',
  CONTADOR_DONO: 'Contador (dono do escritório)',
  OPERADOR_CONTADOR: 'Operador do escritório',
  EMPRESARIO_DONO: 'Empresário (dono da empresa)',
  OPERADOR_EMPRESA: 'Operador da empresa',
};

interface DadosNome {
  nome: string;
}

interface DadosSenha {
  novaSenha: string;
  confirmarSenha: string;
}

/** Auto-serviço do usuário logado -- equivalente ao `/perfil` do jotaCaixa, mas bem mais enxuto: nesta plataforma RBAC/permissões vivem em tabela própria (não no perfil) e não existe ainda geração de contrato com tags cadastrais (Fase 6), então não há CPF/endereço/assinatura pra editar aqui. Só o que existe de verdade hoje: nome (tabela `usuarios`) e senha (Supabase Auth, chamado direto pelo frontend -- mesmo padrão já usado no login). */
export default function Perfil() {
  const [perfil, setPerfil] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);

  const {
    register: registrarNome,
    handleSubmit: handleSubmitNome,
    reset: resetNome,
    formState: { isSubmitting: salvandoNome },
  } = useForm<DadosNome>();

  const {
    register: registrarSenha,
    handleSubmit: handleSubmitSenha,
    reset: resetSenha,
    formState: { isSubmitting: salvandoSenha },
  } = useForm<DadosSenha>({ defaultValues: { novaSenha: '', confirmarSenha: '' } });

  function carregarPerfil() {
    setCarregando(true);
    obterMeuPerfil()
      .then((dados) => {
        setPerfil(dados);
        resetNome({ nome: dados.nome });
      })
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregarPerfil, []);

  async function aoSalvarNome(dados: DadosNome) {
    try {
      const atualizado = await atualizarMeuNome(dados.nome);
      setPerfil(atualizado);
      showSuccess('Nome atualizado com sucesso.');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível atualizar o nome');
    }
  }

  async function aoSalvarSenha(dados: DadosSenha) {
    if (dados.novaSenha !== dados.confirmarSenha) {
      showError('As senhas não conferem.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: dados.novaSenha });
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess('Senha alterada com sucesso.');
    resetSenha({ novaSenha: '', confirmarSenha: '' });
  }

  if (carregando) {
    return (
      <LayoutPrincipal>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutPrincipal>
    );
  }

  if (!perfil) return null;

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <UserCog className="mr-2 h-6 w-6" /> Meu Perfil
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitNome(aoSalvarNome)} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input {...registrarNome('nome', { required: true, minLength: 2 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={perfil.email} disabled />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary">{ROTULO_PAPEL[perfil.papel] ?? perfil.papel}</Badge>
              </div>
              <Button type="submit" disabled={salvandoNome} className="w-full">
                {salvandoNome && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar nome
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <KeyRound className="mr-2 h-4 w-4" /> Segurança
            </CardTitle>
            <CardDescription>Alterar a senha de acesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitSenha(aoSalvarSenha)} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nova senha</Label>
                <Input type="password" placeholder="Mínimo 12 caracteres, com maiúscula, número e símbolo" {...registrarSenha('novaSenha', { required: true, minLength: 12 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirmar nova senha</Label>
                <Input type="password" {...registrarSenha('confirmarSenha', { required: true })} />
              </div>
              <Button type="submit" disabled={salvandoSenha} className="w-full">
                {salvandoSenha && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </LayoutPrincipal>
  );
}
