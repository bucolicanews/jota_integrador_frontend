import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAutenticacao } from './useAutenticacao';
import { listarEmpresas, obterEmpresaInterna } from '../servicos/empresas';
import { definirEmpresaAtiva, limparEmpresaAtiva } from '../store/empresaAtivaSlice';

// Espelha ehPapelDePlataforma/PAPEIS_PLATAFORMA do backend (auth/dominio/papel.ts).
const PAPEIS_PLATAFORMA = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE'];
const PAPEIS_CONTADOR = ['CONTADOR_DONO', 'OPERADOR_CONTADOR'];

/**
 * Resolve "de qual empresa são os dados" nas telas contábeis portadas do jotaCaixa
 * (rotas globais tipo /lancamentos, sem :empresaId na URL).
 *
 * Papéis de empresa (EMPRESARIO_DONO/OPERADOR_EMPRESA) já têm exatamente 1 empresa fixa
 * (usuario.empresaId, vem do JWT) -- não precisam escolher nada, igual o Cliente do
 * jotaCaixa. Papéis de contador têm N empresas na carteira -- precisam de um seletor
 * persistente (Header), guardado em `empresaAtivaSlice`/localStorage. Papéis de plataforma
 * não têm carteira nenhuma pra escolher -- caem direto no workspace fixo da própria Jota
 * (empresa tipo='interna_plataforma'), resolvido uma vez via GET /empresas/interna.
 */
export function useEmpresaAtiva() {
  const { usuario } = useAutenticacao();
  const dispatch = useDispatch();
  const persistido = useSelector((state) => state.empresaAtiva);
  const [carteira, setCarteira] = useState(null);
  const [carregandoCarteira, setCarregandoCarteira] = useState(false);

  // O valor persistido só é válido se pertence ao usuário ATUALMENTE logado -- sem isso,
  // um segundo usuário no mesmo navegador (outro contador, ou o admin) herdava a empresa
  // selecionada pelo anterior (bug real: admin aparecia com saldo de crédito de uma
  // empresa de cliente). `usuario` pode ainda não ter carregado (null) -- nesse caso
  // trata como inválido também, nunca mostra um valor "talvez" certo.
  const empresaAtivaPersistida = usuario && persistido.usuarioId === usuario.id ? persistido.empresa : null;

  const ehContador = Boolean(usuario && PAPEIS_CONTADOR.includes(usuario.papel));
  const ehPlataforma = Boolean(usuario && PAPEIS_PLATAFORMA.includes(usuario.papel));
  const empresaFixaDeUsuarioEmpresa = !ehContador && !ehPlataforma ? usuario?.empresaId ?? null : null;

  // Dono trocou (outro usuário logado nesse navegador, ou nenhum usuário ainda) --
  // descarta o resíduo do usuário anterior em vez de deixar reaproveitável por engano.
  useEffect(() => {
    if (!usuario) return;
    if (persistido.usuarioId && persistido.usuarioId !== usuario.id) {
      dispatch(limparEmpresaAtiva());
    }
  }, [usuario, persistido.usuarioId, dispatch]);

  // Carteira de clientes + a própria empresa do contador (tipo='interna_contador', nunca
  // vem em listarEmpresas() -- é a contabilidade do próprio escritório, não um cliente)
  // na mesma lista, pra ele poder selecionar "a si mesmo" no mesmo seletor do Header.
  useEffect(() => {
    if (!ehContador) return;
    setCarregandoCarteira(true);
    Promise.all([listarEmpresas().catch(() => []), obterEmpresaInterna().catch(() => null)])
      .then(([lista, propria]) => setCarteira(propria ? [{ ...propria, ehPropria: true }, ...lista] : lista))
      .finally(() => setCarregandoCarteira(false));
  }, [ehContador]);

  // Plataforma não escolhe nada -- auto-seleciona o workspace fixo uma vez, se ainda não
  // houver seleção persistida VÁLIDA (do próprio usuário) -- ex: troca de usuário no
  // mesmo navegador, já tratada pelo efeito de cima, mas só depois de um re-render.
  useEffect(() => {
    if (!ehPlataforma || empresaAtivaPersistida) return;
    setCarregandoCarteira(true);
    obterEmpresaInterna()
      .then((empresa) =>
        dispatch(
          definirEmpresaAtiva({ usuarioId: usuario.id, empresa: { id: empresa.id, razaoSocial: empresa.razaoSocial, cnpj: empresa.cnpj } }),
        ),
      )
      .catch(() => {})
      .finally(() => setCarregandoCarteira(false));
  }, [ehPlataforma, empresaAtivaPersistida, usuario, dispatch]);

  // Se a empresa ativa persistida não existe mais na carteira (ex: foi removida da
  // carteira deste contador), limpa em vez de deixar um id órfão. Só vale pra contador --
  // a plataforma sempre resolve pro mesmo workspace fixo, nunca precisa revalidar contra lista.
  useEffect(() => {
    if (!ehContador || !carteira || !empresaAtivaPersistida) return;
    const aindaExiste = carteira.some((e) => e.id === empresaAtivaPersistida.id);
    if (!aindaExiste) dispatch(limparEmpresaAtiva());
  }, [ehContador, carteira, empresaAtivaPersistida, dispatch]);

  const empresaId = ehContador || ehPlataforma ? empresaAtivaPersistida?.id ?? null : empresaFixaDeUsuarioEmpresa;

  function selecionarEmpresa(empresa) {
    dispatch(
      definirEmpresaAtiva({ usuarioId: usuario.id, empresa: { id: empresa.id, razaoSocial: empresa.razaoSocial, cnpj: empresa.cnpj } }),
    );
  }

  return {
    empresaId,
    empresaAtiva: ehContador ? empresaAtivaPersistida : null,
    ehContador,
    // Distinto de ehContador -- usado só onde a UI precisa saber "é visão JOTA CONTÁBIL"
    // sem necessariamente ter carteira pra escolher (ex: título/link do Header).
    ehPlataforma,
    precisaSelecionarEmpresa: (ehContador || ehPlataforma) && !empresaId,
    carteira: carteira ?? [],
    carregandoCarteira,
    selecionarEmpresa,
  };
}
