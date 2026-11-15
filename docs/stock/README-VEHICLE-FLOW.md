# Fluxo de cadastro de veículo e publicação de anúncio

Implementação complementar à branch `feat/crud-poliglota`, após a instalação do pacote de gestão de veículos e anúncios.

## Funcionalidades

- `GET /crud/stock/vehicle-catalog?search=...&limit=25`: consulta configurações existentes do catálogo técnico PostgreSQL.
- `POST /crud/stock/vehicles`: cadastra uma unidade de estoque `AVAILABLE`, sem criar anúncio automaticamente. Pode receber `catalogId` ou dados manuais (marca, modelo, ano fabricação, ano modelo, quilometragem).
- `GET /crud/stock/advertisable-vehicles?search=...&limit=25`: veículos `AVAILABLE` sem anúncio `PUBLISHED`; usado pelo seletor do formulário de anúncios.
- `POST /crud/stock/advertisements`: rota existente, recebe `vehicleId`, título, preço, descrição e indicador de publicação.
- O cadastro da unidade gera auditoria `VEHICLE_CREATED` por outbox transacional, com entrega idempotente ao MongoDB.
- Ao concluir o cadastro na tela **Veículos**, a unidade recém-criada é pré-selecionada na criação do anúncio.
- Cadastro manual **não** cria uma especificação técnica verificada nem inventa fichas oficiais. A opção de catálogo copia os atributos técnicos já registrados.
- Evita exibir veículos já anunciados no seletor de primeiro anúncio; a API existente também impede dois anúncios publicados simultaneamente para a mesma unidade.

## Instalar

Na raiz do repositório e na branch de desenvolvimento:

```powershell
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\AutoDealer_Analytics_Ciclo_Veiculo_Anuncio_Patch.zip" -DestinationPath . -Force
py -3.12 .\docs\stock\apply-vehicle-flow.py
npm --prefix backend run check
npm --prefix backend run build
npm --prefix frontend run build
```

Reinicie `npm run dev` dentro da pasta `backend` e mantenha `CRUD_DEMO_ENABLED=true` somente no ambiente local. A interface de escrita usa a habilitação manual existente.

## Testes

Verificação somente leitura:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\stock\check-vehicle-cycle.ps1
```

Teste opcional completo: **cria veículo e anúncio reais e depois faz exclusão lógica**, preservando linhas históricas/auditoria; não roda automaticamente.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\stock\check-vehicle-cycle.ps1 -ExecuteWriteFlow
```

Teste visual: **Veículos -> Cadastrar veículo -> Criar anúncio (unidade selecionada) -> Publicar -> Catálogo público**.

Não executar `docker compose down -v`, nem scripts de recriação/seed. Não enviar `.env` ao GitHub.
