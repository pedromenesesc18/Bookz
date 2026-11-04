# Bookz

PWA de celular para catalogar livros (lidos / lendo / quero ler / estante).
Sem backend: dados no `localStorage` do aparelho, backup em JSON.
Publicado pelo GitHub Pages direto da raiz do `master` — **não há etapa de build**.

## Fluxo de trabalho (Everything Claude Code)

Este projeto usa o plugin ECC (`.claude/settings.json`) e as regras em
`.claude/rules/ecc/`. Siga o fluxo: **planejar → TDD → revisar → commitar**.

1. Planejar mudanças grandes em `docs/PLAN.md` (agente `planner`).
2. TDD: teste primeiro (RED), código mínimo (GREEN), refatorar. Cobertura ≥ 80%.
3. Revisar com os agentes `code-reviewer` e `security-reviewer`.
4. Commits no formato convencional (`feat:`, `fix:`, `test:`…).

## Comandos

```bash
npm install          # ferramentas de dev (Vitest, Playwright, ESLint, Prettier)
npm start            # servidor local em http://localhost:4173
npm test             # testes unitários (Vitest + jsdom)
npm run test:coverage
npm run test:e2e     # Playwright (perfil iPhone)
npm run lint
npm run check        # tudo acima
```

## Arquitetura

```text
src/lib/      utilitários puros (texto, datas, ids, arquivos)
src/domain/   regras puras e imutáveis: book (validação), library (listas/seletores), draft (formulário)
src/data/     bordas: storage (localStorage), backup (JSON), search (Google Books → Open Library)
src/state/    store imutável + actions (única porta para mudar estado)
src/ui/       app (composição), views por aba, sheets (adicionar/editar/menu), templates
src/styles/   tokens.css (design tokens), base, layout, components, sheet
```

## Regras do projeto

- **Compatibilidade de dados é crítica**: a chave `bookz.v1` e o formato dos livros não
  podem quebrar. Todo dado externo passa por `normalizeBook`.
- Todo valor dinâmico em HTML passa por `escapeHtml`. Capas só `https:`.
- Imutabilidade: nunca mutar `books`/estado; use as funções de `domain/library.js`.
- Arquivos < 400 linhas, funções < 50 linhas (ESLint avisa).
- Ao adicionar/renomear arquivos em `src/`, atualize a lista `ASSETS` e a versão `CACHE` em `sw.js`.
- Textos da interface em português do Brasil.
