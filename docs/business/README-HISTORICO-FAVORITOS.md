# AutoDealer Analytics — Histórico de vistorias e Meus favoritos

Complemento da branch `feat/crud-poliglota`. **Não é um novo CRUD artificial**: reutiliza os recursos de negócio criados anteriormente.

## Recursos incluídos

- **Histórico de vistorias:** novo item do menu administrativo, listando as vistorias de todos os veículos; filtro por situação e UUID do veículo, pesquisa no conjunto carregado, paginação, detalhes, edição e exclusão de rascunho e aprovação definitiva. Marca/modelo/ano vêm do PostgreSQL, enquanto os documentos continuam no MongoDB.
- **Vistorias (cadastro):** botão de acesso ao histórico geral. No histórico, o botão *Nova vistoria deste veículo* abre o formulário com o veículo selecionado.
- **Meus favoritos:** página pública própria na navegação superior, inferior e móvel. Filtros por nome/prioridade, edição de prioridade, remoção e abertura do veículo. Os vínculos de interesse permanecem no Cassandra e são complementados pelo PostgreSQL.
- **Catálogo:** deixa de exibir a lista de favoritos no rodapé e passa a ter atalho para a página dedicada. A opção de favoritar nos detalhes continua funcionando.

## Compatibilidade e limites

- Mantém os endpoints de criação, atualização e exclusão de vistorias. A listagem `GET /crud/inspections?vehicleId=...&limit=30` continua válida.
- Amplia `GET /crud/inspections` para aceitar `page`, `limit`, `status` e `vehicleId` opcionais. `limit` máximo 50. Nova consulta geral não exige vehicleId e retorna `pagination`.
- **Registros aprovados são somente leitura**; exclusão de rascunhos continua exigindo confirmação do usuário.
- `GET /crud/favorites?userId=...` lista até 100 favoritos. Não há autenticação real: usuário de seed, apenas ambiente local e sem acesso externo.
- Pesquisa textual no histórico atua somente sobre a página carregada; o filtro por status e UUID é aplicado no servidor.

## Aplicar sem perder código

1. Trabalhe na branch `feat/crud-poliglota` e confira `git status --short`.
2. Extraia o ZIP na raiz. Ele **não inclui `App.tsx` completo** para evitar sobrescrever o layout Figma. Em vez disso execute `py -3.12 .\docs\business\apply-history-navigation.py`.
3. Reexecute `powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\business\init-business.ps1`, para adicionar os índices de listagem MongoDB (operações idempotentes). **Não execute `docker compose down -v`.**
4. Reinicie apenas a API em `backend` (`npm run dev`) se ela não estiver usando hot reload.
5. Compile e valide:

```powershell
npm --prefix backend run check
npm --prefix backend run build
npm --prefix frontend run build
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\business\check-listing.ps1
```

6. No navegador: crie uma vistoria de rascunho; visite `Histórico de vistorias`, abra detalhes, edite, aprove e confira que somente leitura; confirme que *Nova vistoria deste veículo* preenche o contexto. No site público salve um veículo e abra `♥ Favoritos` para gerenciar a prioridade e remover.
7. **Não faça commit antes de conferir os testes e o diff.** O ZIP não remove arquivos obsoletos do laboratório original; a limpeza deve ser feita depois da validação.

## Arquivos modificados

- `backend/src/modules/business/inspections.routes.ts` (listagem geral paginada)
- `database/mongodb/inspections.js` (índices adicionais idempotentes)
- `frontend/src/live/LiveCatalog.tsx` (atalho para favoritos)
- `frontend/src/live/LiveFavorites.tsx` (gerenciamento aprimorado)
- `frontend/src/live/LiveInspectionsPanel.tsx` (navegação para histórico)

## Arquivos novos

- `frontend/src/live/LiveInspectionsHistory.tsx`
- `frontend/src/live/LiveFavoritesPage.tsx`
- `frontend/src/live/live-history.css`
- `docs/business/apply-history-navigation.py`
- `docs/business/check-listing.ps1`
- este README.

A coleção `audit_events` e as tabelas originais de eventos Cassandra não são alteradas.
