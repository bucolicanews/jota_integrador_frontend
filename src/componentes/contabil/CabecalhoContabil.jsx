import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '../../servicos/supabase';
import { limparUsuario } from '../../store/autenticacaoSlice';

// Papéis de plataforma (Dev/Admin JOTA) -- veem a área administrativa, contador não vê.
export const PAPEIS_PLATAFORMA = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE'];

const LINKS_NAV = [
  { rota: '/contabil', rotulo: 'Dashboard' },
  { rota: '/contabil/empresas', rotulo: 'Carteira de Empresas' },
  { rota: '/contabil/assinatura', rotulo: 'Assinatura' },
  { rota: '/contabil/honorarios', rotulo: 'Honorários' },
  { rota: '/contabil/creditos', rotulo: 'Créditos' },
  { rota: '/contabil/auditoria', rotulo: 'Auditoria' },
];

const LINKS_NAV_ADMIN = [
  { rota: '/contabil/contadores', rotulo: 'Contadores' },
  { rota: '/contabil/empresas-todas', rotulo: 'Empresas (todas)' },
];

/** Cabeçalho + navegação compartilhados entre as telas do JOTA CONTÁBIL -- perfil do contador foca em densidade/velocidade de triagem (docs/UX-UI.md), não em telas isoladas sem navegação entre si. */
export function CabecalhoContabil() {
  const dispatch = useDispatch();
  const localizacao = useLocation();
  const { usuario } = useSelector((state) => state.autenticacao);
  const links = PAPEIS_PLATAFORMA.includes(usuario?.papel) ? [...LINKS_NAV, ...LINKS_NAV_ADMIN] : LINKS_NAV;

  async function sair() {
    await supabase.auth.signOut();
    dispatch(limparUsuario());
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="text-lg font-semibold text-gray-900">JOTA CONTÁBIL</span>
          <nav className="flex gap-1">
            {links.map((link) => {
              const ativo =
                link.rota === '/contabil'
                  ? localizacao.pathname === '/contabil'
                  : localizacao.pathname.startsWith(link.rota);
              return (
                <Link
                  key={link.rota}
                  to={link.rota}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    ativo ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.rotulo}
                </Link>
              );
            })}
          </nav>
        </div>
        <button onClick={sair} className="text-sm text-gray-500 hover:text-gray-700">
          Sair
        </button>
      </div>
    </header>
  );
}
