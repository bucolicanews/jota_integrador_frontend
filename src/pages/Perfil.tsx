import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Building2, KeyRound, Loader2, ShieldCheck, UserCog } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '../servicos/supabase';
import { api } from '../servicos/api';
import { obterMeuPerfil, atualizarMeuNome, atualizarMeuEmail, atualizarMeuAvatar } from '../servicos/perfil';
import { atualizarContador, corrigirCnpjCpfContador, obterMeuContador } from '../servicos/contadores';
import { validarCpfOuCnpj } from '../utils/validarCpfOuCnpj';
import { showError, showSuccess } from '../utils/toast';
import { ROTULO_PAPEL } from '../constantes/papeis';

const formatarCnpjCpf = (valor: string) => {
  const digitos = (valor ?? '').replace(/\D/g, '');
  if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digitos.length === 14) return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return valor ?? '';
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
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [fatorTotp, setFatorTotp] = useState<{ id: string } | null>(null);
  const [carregandoFatorTotp, setCarregandoFatorTotp] = useState(true);
  const [salvandoMetodo2fa, setSalvandoMetodo2fa] = useState(false);
  const [aguardandoCodigoEmail, setAguardandoCodigoEmail] = useState(false);
  const [codigoEmail2fa, setCodigoEmail2fa] = useState('');
  const [erro2fa, setErro2fa] = useState<string | null>(null);
  const [escritorio, setEscritorio] = useState<any | null>(null);
  const [corrigindoDoc, setCorrigindoDoc] = useState(false);
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [salvandoEmail, setSalvandoEmail] = useState(false);
  const [erroEmail, setErroEmail] = useState<string | null>(null);

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
  useEffect(carregarPerfil, [resetNome]);

  function carregarFatorTotp() {
    setCarregandoFatorTotp(true);
    supabase.auth.mfa
      .listFactors()
      .then(({ data }) => {
        const verificado = data?.totp?.find((fator) => fator.status === 'verified');
        setFatorTotp(verificado ? { id: verificado.id } : null);
      })
      .finally(() => setCarregandoFatorTotp(false));
  }
  useEffect(carregarFatorTotp, []);

  async function aoEscolherNenhum() {
    setErro2fa(null);
    setSalvandoMetodo2fa(true);
    try {
      await api.post('/auth/me/2fa/nenhum', {});
      setPerfil((atual: any) => ({ ...atual, metodo2fa: 'nenhum' }));
      showSuccess('Segundo fator desativado.');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível desativar o segundo fator');
    } finally {
      setSalvandoMetodo2fa(false);
    }
  }

  async function aoEscolherTotp() {
    if (!fatorTotp) {
      navigate('/configurar-mfa');
      return;
    }
    // Já tem fator verificado no Supabase (ex: trocou pra email e quer voltar pro app
    // autenticador sem reinscrever) -- só confirma de novo, sem passar pelo QR code.
    setErro2fa(null);
    setSalvandoMetodo2fa(true);
    try {
      await api.post('/auth/me/2fa/totp/confirmar', { factorId: fatorTotp.id });
      setPerfil((atual: any) => ({ ...atual, metodo2fa: 'totp' }));
      showSuccess('App autenticador ativado.');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível ativar o app autenticador');
    } finally {
      setSalvandoMetodo2fa(false);
    }
  }

  async function aoEscolherEmail() {
    setErro2fa(null);
    setSalvandoMetodo2fa(true);
    try {
      await api.post('/auth/me/2fa/email/enviar-codigo', {});
      setAguardandoCodigoEmail(true);
      setCodigoEmail2fa('');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível enviar o código por email');
    } finally {
      setSalvandoMetodo2fa(false);
    }
  }

  async function aoConfirmarCodigoEmail() {
    setErro2fa(null);
    setSalvandoMetodo2fa(true);
    try {
      await api.post('/auth/me/2fa/email/verificar', { codigo: codigoEmail2fa });
      setPerfil((atual: any) => ({ ...atual, metodo2fa: 'email' }));
      setAguardandoCodigoEmail(false);
      showSuccess('Verificação por email ativada.');
    } catch (erro: any) {
      setErro2fa(erro.message ?? 'Código inválido ou expirado');
    } finally {
      setSalvandoMetodo2fa(false);
    }
  }

  useEffect(() => {
    if (ehContador) carregarEscritorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehContador]);

  async function aoEscolherAvatar(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setEnviandoAvatar(true);
    try {
      const atualizado = await atualizarMeuAvatar(arquivo);
      setPerfil(atualizado);
      showSuccess('Foto de perfil atualizada.');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível atualizar a foto de perfil');
    } finally {
      setEnviandoAvatar(false);
      evento.target.value = '';
    }
  }

  async function aoSalvarNome(dados: DadosNome) {
    try {
      const atualizado = await atualizarMeuNome(dados.nome);
      setPerfil(atualizado);
      showSuccess('Nome atualizado com sucesso.');
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível atualizar o nome');
    }
  }

  function aoClicarEditarEmail() {
    setNovoEmail(perfil.email);
    setErroEmail(null);
    setEditandoEmail(true);
  }

  async function aoSalvarEmail() {
    setSalvandoEmail(true);
    setErroEmail(null);
    try {
      const atualizado = await atualizarMeuEmail(novoEmail.trim());
      setPerfil(atualizado);
      setEditandoEmail(false);
      showSuccess('E-mail de login atualizado -- use o novo e-mail no próximo acesso.');
    } catch (erro: any) {
      setErroEmail(erro.message ?? 'Não foi possível atualizar o e-mail');
    } finally {
      setSalvandoEmail(false);
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
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                {perfil.avatarUrl ? (
                  <img src={perfil.avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <UserCog className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label htmlFor="avatar-input" className="cursor-pointer text-sm font-medium text-primary hover:underline">
                  {enviandoAvatar ? 'Enviando...' : 'Trocar foto'}
                </Label>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={enviandoAvatar}
                  onChange={aoEscolherAvatar}
                />
                <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP, máx. 2MB.</p>
              </div>
            </div>
            <form onSubmit={handleSubmitNome(aoSalvarNome)} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input {...registrarNome('nome', { required: true, minLength: 2 })} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Email de login</Label>
                  {!editandoEmail && (
                    <button type="button" onClick={aoClicarEditarEmail} className="text-xs font-medium text-primary hover:underline">
                      Alterar e-mail
                    </button>
                  )}
                </div>
                {editandoEmail ? (
                  <div className="space-y-1.5">
                    <Input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
                    {erroEmail && <p className="text-xs text-destructive">{erroEmail}</p>}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditandoEmail(false)} disabled={salvandoEmail}>
                        Cancelar
                      </Button>
                      <Button type="button" size="sm" onClick={aoSalvarEmail} disabled={salvandoEmail || !novoEmail.trim()}>
                        {salvandoEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar e-mail
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Input value={perfil.email} disabled />
                )}
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

            <div className="mt-6 border-t pt-4">
              <span className="mb-2 flex items-center text-sm font-medium">
                <ShieldCheck className="mr-2 h-4 w-4" /> Verificação em duas etapas
              </span>
              <p className="mb-3 text-xs text-muted-foreground">Opcional -- escolha como confirmar sua identidade a cada login.</p>

              {carregandoFatorTotp ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant={perfil.metodo2fa === 'nenhum' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={aoEscolherNenhum}
                    disabled={salvandoMetodo2fa || perfil.metodo2fa === 'nenhum'}
                  >
                    Nenhuma
                  </Button>
                  <Button
                    type="button"
                    variant={perfil.metodo2fa === 'totp' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={aoEscolherTotp}
                    disabled={salvandoMetodo2fa || perfil.metodo2fa === 'totp'}
                  >
                    App autenticador (TOTP){fatorTotp && perfil.metodo2fa !== 'totp' ? ' -- já cadastrado' : ''}
                  </Button>
                  <Button
                    type="button"
                    variant={perfil.metodo2fa === 'email' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={aoEscolherEmail}
                    disabled={salvandoMetodo2fa || perfil.metodo2fa === 'email'}
                  >
                    Código por email
                  </Button>
                </div>
              )}

              {aguardandoCodigoEmail && (
                <div className="mt-3 space-y-2 rounded-md border p-3">
                  <Label>Código enviado para {perfil.email}</Label>
                  <Input
                    value={codigoEmail2fa}
                    onChange={(e) => setCodigoEmail2fa(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="000000"
                  />
                  {erro2fa && <p className="text-xs text-destructive">{erro2fa}</p>}
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setAguardandoCodigoEmail(false)} disabled={salvandoMetodo2fa}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={aoConfirmarCodigoEmail} disabled={salvandoMetodo2fa || codigoEmail2fa.length !== 6}>
                      {salvandoMetodo2fa && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </div>
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
                {corrigindoDoc ? (
                  <Input {...registrarEscritorio('cnpjCpf', { required: true, validate: (v) => validarCpfOuCnpj(v) || 'CPF/CNPJ inválido' })} />
                ) : (
                  <Input value={formatarCnpjCpf(escritorio.cnpjCpf)} disabled />
                )}
                {errosEscritorio.cnpjCpf && <p className="text-xs text-destructive">{errosEscritorio.cnpjCpf.message}</p>}
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
