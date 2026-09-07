import { configureStore } from '@reduxjs/toolkit';
import autenticacaoReducer from './autenticacaoSlice';

export const store = configureStore({
  reducer: {
    autenticacao: autenticacaoReducer,
  },
});
