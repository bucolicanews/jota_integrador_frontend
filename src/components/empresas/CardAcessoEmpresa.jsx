import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import CartaoLinkAcesso from '../auth/CartaoLinkAcesso';
import { criarUsuario, gerarLinkAcesso, listarUsuarios } from '../../servicos/usuarios';

/**
 * Login do EMPRESARIO_DONO desta empresa, direto na tela de cadastro dela -- antes só
 * dava pra criar em Gerenciar Usuários (tela separada, sem ligação visível com o cadastro
 * da empresa; motivo real de empresas ficarem criadas sem nunca ganhar login nenhum).
 * Sem login ainda -> formulário de criação; com login -> botão de reenviar/gerar link
 * (perdeu o convite, nunca recebeu e-mail por SMTP não configurado, etc).
 */
export default function CardAcessoEmpresa({ empresaId, empresaNome }) {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [erro, setErro] = useState(null);
  const [linkGerado, setLinkGerado] = useState(null);
  const [processando, setProcessando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { nome: '', email: '' } });

  function carregar() {
    setCarregando(true);
    listarUsuarios({ empresaId })
      .then((lista) => {
        const dono = lista.find((u) => u.papel === 'EMPRESARIO_DONO' && u.empresaId === empresaId);
        setUsuario(dono ?? null);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId]);

  async function aoCriar(dados) {
    setErro(null);
    setLinkGerado(null);
    try {
      const resultado = await criarUsuario({
        nome: dados.nome,
        email: dados.email,
        papel: 'EMPRESARIO_DONO',
        empresaId,
      });
      setLinkGerado(resultado.linkAcesso);
      carregar();
    } catch (e) {
      setErro(e.message ?? `Não foi possível criar o acesso de ${empresaNome}`);
    }
  }

  async function aoGerarLink() {
    setProcessando(true);
    setErro(null);
    setLinkGerado(null);
    try {
      const resultado = await gerarLinkAcesso(usuario.id);
      setLinkGerado(resultado.linkAcesso);
    } catch (e) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  }

  if (carregando) return <p className="text-sm text-gray-500">Carregando...</p>;

  return (
    <div className="space-y-3">
      {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {usuario ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-700">
            Login: <span className="font-medium">{usuario.email}</span>{' '}
            <span className={usuario.bloqueado ? 'text-red-600' : 'text-green-700'}>
              {usuario.bloqueado ? '(bloqueado)' : '(ativo)'}
            </span>
          </p>
          <button
            type="button"
            onClick={aoGerarLink}
            disabled={processando}
            className="rounded-md border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            {processando ? 'Gerando...' : 'Gerar link de acesso'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(aoCriar)} className="space-y-2">
          <p className="text-sm text-amber-700">⚠️ Esta empresa ainda não tem login cadastrado.</p>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Nome do responsável"
              {...register('nome', { required: true, minLength: 2 })}
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <input
              type="email"
              placeholder="E-mail"
              {...register('email', { required: true })}
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Criando...' : 'Criar acesso'}
            </button>
          </div>
          {(errors.nome || errors.email) && <p className="text-xs text-red-600">Nome e e-mail são obrigatórios.</p>}
        </form>
      )}

      {linkGerado && <CartaoLinkAcesso link={linkGerado} />}
    </div>
  );
}
