import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../../servicos/api';
import { supabase } from '../../servicos/supabase';
import { limparUsuario } from '../../store/autenticacaoSlice';

export default function Fiscal() {
  const dispatch = useDispatch();
  const { usuario } = useSelector((state) => state.autenticacao);
  const [empresa, setEmpresa] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        const dados = await api.get(`/empresas/${usuario.empresaId}`);
        setEmpresa(dados);
      } catch (erroRequisicao) {
        setErro(erroRequisicao.message);
      }
    }
    if (usuario?.empresaId) carregar();
  }, [usuario]);

  async function sair() {
    await supabase.auth.signOut();
    dispatch(limparUsuario());
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">JOTA FISCAL</h1>
        <button onClick={sair} className="text-sm text-gray-500 hover:text-gray-700">
          Sair
        </button>
      </header>

      {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>}

      {empresa && (
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">Sua empresa</p>
          <p className="mb-4 text-xl font-semibold text-gray-900">{empresa.razaoSocial}</p>

          <p className="text-sm text-gray-500">Situação</p>
          <p className="text-lg font-medium text-green-600">
            {empresa.bloqueado ? '🔴 Bloqueada' : '🟢 Regular'}
          </p>
        </div>
      )}
    </div>
  );
}
