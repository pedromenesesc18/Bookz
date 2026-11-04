# Bookz — Plano de reconstrução (ECC)

Reconstrução do app seguindo o fluxo do **Everything Claude Code**:
pesquisa → plano → TDD → revisão de código → revisão de segurança → commit.

## Propósito (não muda)

App de celular (PWA) para catalogar livros:

- **Lidos** — agrupados por ano e mês, com nota em estrelas e resumo do ano.
- **Lendo** — livros em andamento.
- **Quero ler** — lista de desejos.
- **Estante** — livros físicos ainda não lidos.
- Busca com capa (Google Books, com Open Library como reserva).
- Offline, instalável, dados só no aparelho, backup em arquivo JSON.

## Requisitos

| #   | Requisito                                                                            | Prioridade |
| --- | ------------------------------------------------------------------------------------ | ---------- |
| R1  | Dados antigos (`localStorage['bookz.v1']`) continuam funcionando sem migração manual | Crítico    |
| R2  | Backups antigos (`{app, version, books}` ou array puro) podem ser importados         | Crítico    |
| R3  | Toda entrada externa (API, backup, formulário) é validada e higienizada              | Alto       |
| R4  | Nenhum HTML montado com dado não escapado                                            | Alto       |
| R5  | Progresso de leitura (página atual) nos livros "lendo"                               | Novo       |
| R6  | Remover livro com "Desfazer" em vez de `confirm()`                                   | Novo       |
| R7  | Cobertura de testes ≥ 80% + testes E2E dos fluxos principais                         | Alto       |
| R8  | Sem etapa de build: GitHub Pages continua servindo a raiz do `master`                | Alto       |

## Arquitetura

ES modules nativos, sem framework e sem bundler (KISS / YAGNI).

```text
src/
├── lib/        utilitários puros (datas, texto, ids)
├── domain/     regras de negócio puras e imutáveis (livro, biblioteca, estatísticas)
├── data/       bordas do sistema: storage, backup, busca na internet
├── state/      store imutável com assinatura (subscribe)
├── ui/         renderização: templates, views por aba, sheets, toast
├── styles/     tokens.css, base.css, components.css
└── main.js     composição (liga store, UI e eventos)
```

Regras de dependência: `domain` não conhece `ui` nem `data`; `ui` só lê o estado
e despacha ações; efeitos colaterais (fetch, localStorage) ficam em `data/`.

## Fases

1. **Domínio (TDD)** — `book.js` (normalizar/validar), `library.js` (adicionar,
   atualizar, remover, mesclar, seletores), `stats.js`.
2. **Dados (TDD)** — `storage.js`, `backup.js`, `search.js` (fetch injetável, timeout).
3. **Estado (TDD)** — `store.js`.
4. **UI** — templates + views + sheets, testados com jsdom.
5. **E2E** — Playwright: adicionar manual, editar, nota, remover/desfazer,
   busca (API mockada), backup exportar/importar, dados legados.
6. **Revisão** — agentes `code-reviewer` e `security-reviewer` do ECC.
7. **CI** — GitHub Actions rodando testes unitários com cobertura e E2E.

## Riscos

- **Perda de dados do usuário** → manter a mesma chave e formato; testes cobrindo dados legados.
- **Cache do service worker servindo versão velha** → nova versão de cache + network-first.
- **APIs de livros instáveis** → timeout e fallback para Open Library; falha mostra mensagem amigável.
