# Âmitse A Arquiteta da Autonomia da Mulher

Projeto exportado da **Fabapp**. É um app **React + Vite** (SPA client-side, React Router + shadcn/ui).

## Como rodar

```bash
npm install
npm run dev      # ambiente de desenvolvimento (Vite)
npm run build    # build de produção → dist/
```

## Backend Fabapp

Este app continua usando o **backend da Fabapp** (dados, autenticação e integrações) através do SDK. A configuração
fica no arquivo `.env` (variáveis `VITE_FAB_*`), que aponta para o projeto na API da Fabapp. Nenhuma chave secreta
ou credencial de integração é incluída neste pacote — os segredos permanecem no backend.

## O que é plataforma vs. o que é seu

- **Plataforma** (base do SDK/componentes — evite editar): `src/lib/fab-*` (SDK e peças prontas), `src/components/ui/*`
  (componentes de UI), além de `vite.config.ts`, `tsconfig*.json` e `index.html`.
- **Seu app** (o que a IA gerou e você edita): `src/routes.tsx`, `src/pages/*`, `src/components/*` (fora de `ui/`)
  e `src/lib/*` de domínio.
