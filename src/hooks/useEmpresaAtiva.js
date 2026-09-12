import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAutenticacao } from './useAutenticacao';
import { listarEmpresas } from '../servicos/empresas';
import { definirEmpresaAtiva, limparEmpresaAtiva } from '../store/empresaAtivaSlice';

const PAPEIS_CONTADOR = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE', 'CONTADOR_DONO', 'OPERADOR_CONTADOR'];

/**
 * Resolve "de qual empresa são os dados" nas telas contábeis portadas do jotaCaixa
 * (rotas globais tipo /lancamentos, sem :empresaId na URL).
 *
 * Papéis de empresa (EMPRESARIO_DONO/OPERADOR_EMPRESA) já têm exatamente 1 empresa fixa
 * (usuario.empresaId, vem do JWT) -- não precisam escolher nada, igual o Cliente do
 * jotaCaixa. Papéis de contador têm N empresas na carteira -- precisam de um seletor
 * persistente (Header), guardado em `empresaAtivaSlice`/localStorage.
 */
export function useEmpresaAtiva() {
  const { usuario } = useAutenticacao();
  const dispatch = useDispatch();
  const empresaAtivaPersistida = useSelector((state) => state.empresaAtiva.empresa);
  const [carteira, setCarteira] = useState(null);
  const [carregandoCarteira, setCarregandoCarteira] = useState(false);

  const ehContador = usuario && PAPEIS_CONTADOR.includes(usuario.papel);
  const empresaFixaDeUsuarioEmpresa = !ehContador ? usuario?.empresaId ?? null : null;

  useEffect(() => {
    if (!ehContador) return;
    setCarregandoCarteira(true);
    listarEmpresas()
      .then((lista) => setCarteira(lista))
      .catch(() => setCarteira([]))
      .finally(() => setCarregandoCarteira(false));
  }, [ehContador]);

  // Se a empresa ativa persistida não existe mais na carteira (ex: outro usuário no
  // mesmo navegador), limpa em vez de deixar um id órfão.
  useEffect(() => {
    if (!ehContador || !carteira || !empresaAtivaPersistida) return;
    const aindaExiste = carteira.some((e) => e.id === empresaAtivaPersistida.id);
    if (!aindaExiste) dispatch(limparEmpresaAtiva());
  }, [ehContador, carteira, empresaAtivaPersistida, dispatch]);

  const empresaId = ehContador ? empresaAtivaPersistida?.id ?? null : empresaFixaDeUsuarioEmpresa;

  function selecionarEmpresa(empresa) {
    dispatch(definirEmpresaAtiva({ id: empresa.id, razaoSocial: empresa.razaoSocial, cnpj: empresa.cnpj }));
  }

  return {
    empresaId,
    empresaAtiva: ehContador ? empresaAtivaPersistida : null,
    ehContador: Boolean(ehContador),
    precisaSelecionarEmpresa: Boolean(ehContador) && !empresaId,
    carteira: carteira ?? [],
    carregandoCarteira,
    selecionarEmpresa,
  };
}
