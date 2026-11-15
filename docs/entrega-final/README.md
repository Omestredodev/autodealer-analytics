# AutoDealer Analytics — Entrega final acadêmica

Pacote complementar à aplicação existente, consolidado para a disciplina **Tuning e Performance de Dados** (novembro de 2026).

## Conteúdo

- `apresentacao/AutoDealer_Analytics_Apresentacao_Final.pptx`: slides **editáveis** com 14 páginas.
- `apresentacao/AutoDealer_Analytics_Apresentacao_Final.pdf`: cópia em PDF da apresentação.
- `apresentacao/ROTEIRO_APRESENTACAO.md`: fala sugerida, roteiro da demonstração e perguntas da banca.
- `relatorio/AutoDealer_Analytics_Relatorio_Tecnico.docx`: relatório técnico editável.
- `relatorio/AutoDealer_Analytics_Relatorio_Tecnico.pdf`: relatório pronto para leitura.
- `relatorio/AutoDealer_Analytics_Relatorio_Tecnico.md`: versão Markdown adequada ao GitHub.
- `scripts/verificar-ambiente.ps1`: verificação **somente de leitura** dos serviços locais.
- `CHECKLIST_ENTREGA_FINAL.md`: checklist da submissão e da demonstração.

## Como preparar uma demonstração

Na raiz do projeto:

```powershell
docker compose up -d
docker compose ps
```

Em um terminal dedicado:

```powershell
cd .\backend
npm run dev
```

Em outro terminal dedicado:

```powershell
cd .\frontend
npm run dev
```

Em um terceiro terminal, na raiz do projeto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\entrega-final\scripts\verificar-ambiente.ps1
```

Acesse `http://127.0.0.1:5173` e siga o roteiro da apresentação. **Não execute novamente seeds** e **não use `docker compose down -v`**.

## Como versionar este pacote

Se você extrair o ZIP na **raiz** do repositório, os arquivos ficarão dentro de `docs/entrega-final/`. Crie uma branch de documentação a partir da `main` e prepare exclusivamente essa pasta com `git add docs/entrega-final`. Faça o Pull Request e depois sincronize a `main`.

## Pontos a completar antes de entregar

Preencher equipe/docente na capa do relatório e, se desejar, na apresentação. Validar se o código `benchmark.py` usado nos testes declarou explicitamente o nível de consistência para o driver Python, pois o `benchmark.cql` já declara `ONE` mas a cópia Python originalmente examinada não o fazia.
