import { supabase } from './supabase';

const URL_BASE = import.meta.env.VITE_API_URL;

/**
 * Cliente único da API do backend -- anexa o access_token da sessão Supabase Auth
 * automaticamente. Nenhuma chamada de domínio (empresas, contadores, créditos, SERPRO)
 * fala com Supabase direto -- sempre passa por aqui (CLAUDE.md deste repo).
 */
async function requisicao(caminho, opcoes = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...opcoes.headers,
    },
  });

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const erro = new Error(corpo?.message ?? `Erro ${resposta.status} ao chamar ${caminho}`);
    erro.status = resposta.status;
    erro.corpo = corpo;
    throw erro;
  }

  return corpo;
}

export const api = {
  get: (caminho) => requisicao(caminho, { method: 'GET' }),
  post: (caminho, dados) => requisicao(caminho, { method: 'POST', body: JSON.stringify(dados) }),
  patch: (caminho, dados) => requisicao(caminho, { method: 'PATCH', body: JSON.stringify(dados) }),
};
