# Reorganização do cadastro e destaques reais

Este pacote altera somente o frontend/backend e adiciona a migração `002_featured_advertisements.sql`. Não contém fotografias nem imagens genéricas de veículos.

## O que muda

- `Cadastro de veículo` usa o formulário real, com seleção do catálogo técnico ou cadastro manual.
- Ao salvar, abre `Anúncios` com o veículo já selecionado.
- `Veículos` mostra a gestão do estoque e encaminha o usuário para cadastro/anúncio.
- `Anúncios` permite marcar/remover **destaque** em anúncios `PUBLISHED` de veículos `AVAILABLE`.
- A home consulta `GET /featured-vehicles` em vez dos dois anúncios estáticos Figma. Sem registros destacados, mostra um estado vazio.
- Marcações de destaque são auditadas via outbox PostgreSQL → MongoDB.

## Aplicar

Na branch `feat/crud-poliglota`, de preferência com um backup ou commit WIP seguro, descompacte na raiz e execute:

```powershell
py -3.12 .\docs\featured\apply-featured.py
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\featured\init-featured.ps1
npm --prefix backend run check
npm --prefix backend run build
npm --prefix frontend run build
```

Reinicie o backend em `backend/` com `npm run dev`; mantenha `CRUD_DEMO_ENABLED=true` apenas no `.env` local para gestão administrativa. Não exponha a API na internet sem autenticação.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\featured\check-featured.ps1
```

## Teste visual

1. Abra **Cadastro de veículo**, habilite o modo local e cadastre uma unidade de teste.
2. Confirme a transição automática para **Anúncios**, com o novo veículo selecionado; crie e publique.
3. Em **Anúncios**, clique **Destacar no site** nesse anúncio.
4. Volte ao site público, em **Início**. O card agora deve exibir os dados reais do veículo, sem a Jeep/Volvo fictícios.
5. Abra **Ver detalhes** e confira o mesmo veículo no catálogo.
6. Volte a **Anúncios**, clique **Remover destaque**, recarregue a home e confira a remoção.
7. Em **Veículos**, confira a listagem de estoque e o botão **Cadastrar veículo** sem formulário duplicado.

**Atenção:** A migração é aditiva, não apaga dados. O teste de leitura não altera registros. O cadastro/publicação feitos manualmente alteram dados reais do ambiente local. Preferir uma unidade de demonstração.

## Fotografias (fase posterior)

Recomenda-se criar a entidade `vehicle_photos` (metadados no PostgreSQL) e salvar o arquivo fora do banco (storage persistente ou objeto). Validar MIME, tamanho, quantidade, autorização, URL e evitar imagens de terceiros sem direitos de uso. O anúncio escolhe a foto principal do veículo. A presente atualização mantém um placeholder identificável porque não há fotos cadastradas.
