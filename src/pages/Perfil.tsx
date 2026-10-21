import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, KeyRound, Loader2, UserCog } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '../servicos/supabase';
import { obterMeuPerfil, atualizarMeuNome } from '../servicos/perfil';
import { atualizarContador, corrigirCnpjCpfContador, obterMeuContador } from '../servicos/contadores';
import { validarCpfOuCnpj } from '../utils/validarCpfOuCnpj';
import { showError, showSuccess } from '../utils/toast';

const formatarCnpjCpf = (valor: string) => {
  const digitos = (valor ?? '').replace(/\D/g, '');
  if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digitos.length === 14) return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return valor ?? '';
};

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

interface DadosEscritorio {
  nome: string;
  email: string;
  telefone: string;
  cnpjCpf: string;
}

/**
 * Auto-serviço do usuário logado -- equivalente ao `/perfil` do jotaCaixa, mas enxuto:
 * nome (tabela `usuarios`) e senha (Supabase Auth). Pra CONTADOR_DONO/OPERADOR_CONTADOR,
 * ganha também "Dados do escritório" (a entidade `contadores`, diferente do usuário) --
 * só lugar onde o próprio contador consegue ver/editar isso, já que a tela de admin é
 * restrita a papel de plataforma.
 */
export default function Perfil() {
  const [perfil, setPerfil] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [escritorio, setEscritorio] = useState<any | null>(null);
  const [corrigindoDoc, setCorrigindoDoc] = useState(false);

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

  const {
    register: registrarEscritorio,
    handleSubmit: handleSubmitEscritorio,
    reset: resetEscritorio,
    formState: { errors: errosEscritorio, isSubmitting: salvandoEscritorio },
  } = useForm<DadosEscritorio>();

  const ehContador = perfil?.papel === 'CONTADOR_DONO' || perfil?.papel === 'OPERADOR_CONTADOR';

  function carregarEscritorio() {
    obterMeuContador()
      .then((dados) => {
        setEscritorio(dados);
        resetEscritorio({ nome: dados.nome, email: dados.email, telefone: dados.telefone ?? '', cnpjCpf: dados.cnpjCpf });
      })
      .catch((erro) => showError(erro.message));
  }

  function aoClicarCorrigirDoc() {
    const confirmado = window.confirm(
      'Corrigir o CPF/CNPJ muda a identidade legal do seu escritório. Só faça isso se foi cadastrado errado. Continuar?',
    );
    if (confirmado) setCorrigindoDoc(true);
  }

  async function aoSalvarEscritorio(dados: DadosEscritorio) {
    try {
      if (corrigindoDoc && dados.cnpjCpf.replace(/\D/g, '') !== escritorio.cnpjCpf) {
        await corrigirCnpjCpfContador(escritorio.id, dados.cnpjCpf);
      }
      await atualizarContador(escritorio.id, { nome: dados.nome, email: dados.email, telefone: dados.telefone || null });
      setCorrigindoDoc(false);
      carregarEscritorio();
      showSuccess('Dados do escritório atualizados.');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível salvar os dados do escritório');
    }
  }

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

  useEffect(() => {
    if (ehContador) carregarEscritorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehContador]);

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

      {ehContador && escritorio && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Building2 className="mr-2 h-4 w-4" /> Dados do escritório
            </CardTitle>
            <CardDescription>Dados cadastrais do seu escritório contábil junto à Jota.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitEscritorio(aoSalvarEscritorio)} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Nome / Nome do escritório</Label>
                <Input {...registrarEscritorio('nome', { required: true, minLength: 2 })} />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>CPF ou CNPJ</Label>
                  {!corrigindoDoc && (
                    <button type="button" onClick={aoClicarCorrigirDoc} className="text-xs font-medium text-primary hover:underline">
                      Corrigir CPF/CNPJ
                    </button>
                  )}
                </div>
                <Input {...registrarEscritorio('cnpjCpf', { required: true })} disabled={!corrigindoDoc} />
                {!corrigindoDoc && !validarCpfOuCnpj(escritorio.cnpjCpf) && (
                  <p className="text-xs font-medium text-destructive">⚠️ Este documento não passa na validação de formato -- considere corrigir.</p>
                )}
                {corrigindoDoc && <p className="text-xs text-amber-600">Confira bem antes de salvar -- essa correção é registrada em auditoria.</p>}
              </div>

              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" {...registrarEscritorio('email', { required: true })} />
                {errosEscritorio.email && <p className="text-xs text-destructive">Obrigatório</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input {...registrarEscritorio('telefone')} />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={salvandoEscritorio}>
                  {salvandoEscritorio && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar dados do escritório
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </LayoutPrincipal>
  );
}
