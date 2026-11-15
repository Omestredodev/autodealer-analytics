# Administração de veículos e anúncios — AutoDealer Analytics

## Função

Este pacote acrescenta rotas administrativas separadas dos endpoints públicos `/vehicles` e `/advertisements`.
Ele NÃO altera os dados de seed, o schema nem as tabelas já existentes.

- `GET /crud/stock/vehicles?page=1&limit=12&search=&status=`: lista todos os veículos, incluindo os sem anúncio.
- `GET /crud/stock/advertisements?page=1&limit=12&search=&status=`: lista anúncios em todos os status.
- `POST /crud/stock/advertisements`: cria anúncio em DRAFT ou PUBLISHED (`publish: true`), para veículo AVAILABLE.
- `PATCH /crud/stock/advertisements/:id`: edita título/descrição/preço e altera status conforme regras.
- `DELETE /crud/stock/advertisements/:id`: exclusão **lógica** — status ENDED; histórico preservado.
- `DELETE /crud/stock/vehicles/:id`: exclusão **lógica** — status INACTIVE e encerramento dos anúncios; vendas pendentes/concluídas ou agendamentos ativos bloqueiam a operação.

As escritas usam transação PostgreSQL + outbox de auditoria para MongoDB. Os endpoints são registrados dentro de `/crud`, que exige `CRUD_DEMO_ENABLED=true` na API local.

## Aplicação

1. Mantenha o trabalho na branch `feat/crud-poliglota`. Não aplique direto na `main`.
2. Extraia o ZIP na raiz de `C:\Projetos\autodealer-analytics` com `Expand-Archive -Force`.
3. Execute `py -3.12 .\docs\stock\apply-stock.py` para integrar rotas e a interface com alterações localizadas.
4. Mantenha `CRUD_DEMO_ENABLED=true` somente no `backend/.env` local (não versione `.env`).
5. Reinicie o backend, abra novo terminal e execute:

```powershell
npm --prefix backend run check
npm --prefix backend run build
npm --prefix frontend run build
```

6. Teste os endpoints somente leitura:

```powershell
curl.exe -i "http://127.0.0.1:3333/crud/stock/vehicles?page=1&limit=2"
curl.exe -i "http://127.0.0.1:3333/crud/stock/advertisements?page=1&limit=2"
```

7. Teste as quatro consultas de leitura com `powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\stock\check-stock.ps1`.
8. Abra os módulos administrativos **Veículos** e **Anúncios** no frontend. Confira:
   - veículo sem anúncio aparece na gestão, mas não no catálogo público;
   - criar rascunho não publica no catálogo;
   - publicar anúncio para veículo AVAILABLE, sem outro PUBLISHED, o torna público;
   - pausar e encerrar o anúncio o retira do catálogo;
   - retirar veículo sem venda/agendamento ativo do estoque o muda para INACTIVE, encerrando anúncios;
   - veículo vendido ou com operação ativa bloqueia retirada com HTTP 409;
   - o MongoDB recebe as mudanças via outbox quando estiver disponível.

### Observações e segurança

A exclusão é lógica, intencionalmente: a relação comercial, os leads, as vendas, as vistorias e a auditoria não devem ser apagados em cascata. O botão informa essa semântica.
O sistema não implementa autenticação; não publique a API na internet nem habilite `CRUD_DEMO_ENABLED` fora do ambiente local.
A implantação em ambiente novo e a atualização do README principal continuam sendo validações separadas antes da entrega.

## Teste com dados de exemplo

Na tela **Veículos**, use a busca para localizar um veículo `AVAILABLE` sem anúncio publicado. Clique em **Criar anúncio**.
Preencha título, descrição e preço. Salve primeiro como rascunho; na tela **Anúncios**, filtre `DRAFT`, edite-o, publique-o e verifique o catálogo público. Por fim, encerre o anúncio. Não inative veículos de produção/seeds relevantes durante o ensaio, salvo registro criado especificamente para teste.

## Melhorias de dados (etapa posterior)

Aumentar os registros de `vehicle_catalog` por marca/modelo/versão, sem inventar especificações, usando fontes oficiais verificáveis de fabricantes e documentação técnica. Manter `specification_source` e `specification_verified`, com chaves únicas e seed reexecutável. Não misturar essa mudança com a correção de rotas.
