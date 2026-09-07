import { createClient } from '@supabase/supabase-js';

// Único uso legítimo do Supabase client direto no frontend: login/sessão (Supabase
// Auth). Nunca usar isso pra ler/escrever tabela de domínio -- sempre via servicos/api.js
// (regra de ouro do CLAUDE.md deste repo).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
