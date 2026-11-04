# Bookz 📚

App de celular pra catalogar livros: **lidos** (por ano e mês, com nota em estrelas),
**lendo** (com progresso de páginas), **quero ler** e **estante** (livros físicos ainda não lidos).

- Busca de livros com capa (Google Books / Open Library), inclusive por ISBN
- **Ler código de barras** com a câmera: aponta para o ISBN atrás do livro e ele já vem preenchido
- Estantes animadas: prateleira do ano em **Lidos** (lombadas com a cor da capa e altura pelas páginas), livro com fita de marcador em **Lendo** e parede de prateleiras na **Estante**
- Capas preenchidas automaticamente para livros sem capa, e botão **Escolher capa** para trocar
- Funciona offline e pode ser instalado na tela inicial
- Dados salvos no próprio aparelho, com backup em arquivo (menu ⋮)
- Remover livro tem "Desfazer"

## Publicar

Settings → Pages → Source: _Deploy from a branch_ → `master` / `(root)`.
Não precisa de build: o GitHub Pages serve os arquivos como estão.

## Instalar no iPhone

Abra o link no Safari → Compartilhar → **Adicionar à Tela de Início**.

## Desenvolvimento

Construído com o fluxo do [Everything Claude Code](https://github.com/affaan-m/ECC):
plano em [`docs/PLAN.md`](docs/PLAN.md), TDD, revisão de código e de segurança.
Veja [`CLAUDE.md`](CLAUDE.md) para comandos e arquitetura.

```bash
npm install
npm start          # http://localhost:4173
npm run check      # lint + testes unitários (cobertura) + E2E
```
