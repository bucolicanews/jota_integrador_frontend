import { createSlice } from '@reduxjs/toolkit';

const estadoInicial = {
  usuario: null, // { id, email, papel, contadorId, empresaId } -- vem do app_metadata do JWT
  carregando: true, // true até a primeira checagem de sessão terminar
  // true quando a sessão veio de um link de acesso (tipo `recovery`, evento
  // PASSWORD_RECOVERY) -- força a tela /definir-senha antes de liberar o resto do app,
  // senão o usuário fica "logado" sem nunca ter definido senha nenhuma (ver
  // useAutenticacao.js e RotaProtegida.jsx).
  precisaDefinirSenha: false,
};

const autenticacaoSlice = createSlice({
  name: 'autenticacao',
  initialState: estadoInicial,
  reducers: {
    definirUsuario(state, action) {
      state.usuario = action.payload;
      state.carregando = false;
    },
    limparUsuario(state) {
      state.usuario = null;
      state.carregando = false;
      state.precisaDefinirSenha = false;
    },
    marcarPrecisaDefinirSenha(state) {
      state.precisaDefinirSenha = true;
    },
    limparPrecisaDefinirSenha(state) {
      state.precisaDefinirSenha = false;
    },
  },
});

export const { definirUsuario, limparUsuario, marcarPrecisaDefinirSenha, limparPrecisaDefinirSenha } = autenticacaoSlice.actions;
export default autenticacaoSlice.reducer;
