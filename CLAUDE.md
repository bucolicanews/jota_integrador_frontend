# jota_integrador_frontend

Frontend (React + Vite) do **JOTA FISCAL** (GitHub: `jota_integrador_frontend`; pasta local ainda chamada `jota_fiscal_frontend` por questão de sincronização do OneDrive). O backend/API vive no repositório irmão `jota_integrador_backend` (GitHub `bucolicanews/jota_integrador_backend`, pasta local `C:\Users\jotac\OneDrive\Documents\DEV\jota_integrador`).

## Nomenclatura

Todo nome de domínio (pastas, módulos, componentes, variáveis de negócio) deve ser em **português**: `paginas/contabil`, `servicos/certificados`, `EmpresaCard`, `consultarSituacaoFiscal()`. Jargão técnico universal do ecossistema React (hook, service, DTO, store, guard) permanece em inglês, como já é convenção mesmo em times BR — mas qualquer nome que descreva conceito do domínio fiscal/contábil é pt-BR, sem exceção.

## Memória e regras — sempre consultar antes de trabalhar

Este repositório **não duplica** a documentação de segurança/arquitetura/testes/UX — ela vive no repo backend `jota_integrador_backend`:

- `../jota_integrador/CLAUDE.md` — visão geral do produto e regras invioláveis
- `../jota_integrador/docs/SEGURANCA.md` — segurança (relevante ao frontend: nunca armazenar certificado/JWT/dado sensível em localStorage, nunca falar direto com SERPRO)
- `../jota_integrador/docs/ARQUITETURA.md` — modelo de dados e hierarquia Dev Admin → Contador → Empresa
- `../jota_integrador/docs/TESTES.md` — estratégia de testes
- `../jota_integrador/docs/UX-UI.md` — diretrizes de design para os dois perfis (JOTA FISCAL / JOTA CONTÁBIL)

E a memória persistente em `C:\Users\jotac\.claude\projects\C--Users-jotac-OneDrive-Documents-DEV\memory\MEMORY.md`, e o vault `may_memory` (`C:\Users\jotac\OneDrive\Documents\DEV\may_memory\INDEX.md`).

## Regra de ouro

Este frontend **nunca** chama o SERPRO/Integra Contador diretamente, e **nunca** armazena certificado digital, JWT persistente, refresh token ou dado sensível em `localStorage`/`sessionStorage`/`IndexedDB`. Toda chamada passa pela API do `jota_integrador_backend` (NestJS), que usa `HttpOnly`/`Secure`/`SameSite=Strict` cookies para sessão.

## Stack

React + Vite. Demais decisões de biblioteca (roteamento, formulários, estado) seguem o mesmo padrão já validado no DeliveryHub (`deliveryhub_white_label`) quando não houver razão específica para divergir — ver `[[project_deliveryhub]]` na memória.

## Estrutura

```
src/
├── paginas/
│   ├── fiscal/      (visão do empresário — JOTA FISCAL)
│   └── contabil/    (visão do contador — JOTA CONTÁBIL)
├── componentes/
├── hooks/
├── servicos/        (chamadas à API do jota_integrador_backend)
└── store/
```

## Status

Projeto em fase inicial — estrutura definida, implementação ainda não iniciada.
