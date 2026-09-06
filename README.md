# JOTA FISCAL — Frontend

Frontend (React + Vite) da plataforma JOTA FISCAL. O backend/API vive no repositório irmão [`jota_integrador`](https://github.com/bucolicanews/jota_integrador).

Dois perfis de interface sobre a mesma base:

- **JOTA FISCAL** (`src/paginas/fiscal`) — visão do empresário.
- **JOTA CONTÁBIL** (`src/paginas/contabil`) — visão do contador, gestão de carteira de empresas.

## Regra de ouro

Este app nunca fala diretamente com o SERPRO nem armazena certificado digital, JWT ou dado sensível em `localStorage`. Toda comunicação passa pela API do `jota_integrador`.

## Documentação

A documentação de segurança, arquitetura, testes e UX/UI é centralizada no repositório backend — ver [`jota_integrador/docs`](https://github.com/bucolicanews/jota_integrador/tree/main/docs) e o [`CLAUDE.md`](CLAUDE.md) deste repo.

## Status

Projeto em fase inicial — estrutura definida, implementação ainda não iniciada.
