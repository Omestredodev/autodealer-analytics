# AutoDealer Analytics — Arquitetura Full-Stack e Integração Tri-Banco

Este documento detalha a implementação da aplicação **Full-Stack em TypeScript** que conecta a interface do design Figma com o banco de dados **MongoDB** (coleção de auditoria e histórico) e estabelece a camada de integração com **PostgreSQL** e **Apache Cassandra**.

---

## 1. Arquitetura Tri-Banco

O sistema segue a divisão oficial definida no contrato de dados (`data-contract.md` e `database-architecture.md`):

```
                        ┌─────────────────────────────────────┐
                        │    AutoDealer Frontend (React 19)   │
                        │   (Catálogo, Admin, Auditoria, CAP) │
                        └──────────────────┬──────────────────┘
                                           │ HTTP / In-Process API
                                           ▼
                        ┌─────────────────────────────────────┐
                        │     TypeScript Backend Services     │
                        │  (Vehicle, Ad, Sale, Lead, Audit)   │
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌─────────────────────────────────────┐
                        │    Integration Event Bus & Saga     │
                        │   - Geração de UUID v4 Canônico     │
                        │   - Idempotência por eventId        │
                        │   - Correlação via correlationId    │
                        └───────┬──────────┬──────────┬───────┘
                                │          │          │
                 ┌──────────────┘          │          └──────────────┐
                 ▼                         ▼                         ▼
   ┌───────────────────────────┐ ┌───────────────────┐ ┌───────────────────────────┐
   │      PostgreSQL Core      │ │   MongoDB Audit   │ │    Apache Cassandra       │
   ├───────────────────────────┤ ├───────────────────┤ ├───────────────────────────┤
   │ - Fonte Oficial           │ │ - Coleção:        │ │ - Telemetria/Navegação    │
   │ - Entidades Transacionais │ │   `audit_events`  │ │ - Visualizações de anúncio│
   │ - Veículos, Anúncios,     │ │ - JSON Schema     │ │ - Cliques e favoritos     │
   │   Leads, Vendas           │ │   Validador       │ │ - Alto volume             │
   │ - Estado Atual            │ │ - Índices ESR     │ │ - Chaves de partição      │
   │                           │ │ - Deltas de valor │ │                           │
   └───────────────────────────┘ └───────────────────┘ └───────────────────────────┘
```

---

## 2. Camada de Integração TypeScript (`src/server/`)

A camada de servidor em TypeScript foi construída com padrões limpos de separação de responsabilidades:

| Módulo | Arquivo | Responsabilidade |
|---|---|---|
| **Contratos e Tipos** | `src/server/types/events.ts` | Enum dos 12 eventos oficiais, dicionário de status e interfaces BSON. |
| **Modelos PostgreSQL** | `src/server/types/models.ts` | Interfaces de Veículo, Anúncio, Lead, Agendamento e Venda. |
| **Repositório MongoDB** | `src/server/db/mongo.ts` | Conexão real via driver oficial `mongodb` e operações de auditoria idempotentes. |
| **Repositório PostgreSQL** | `src/server/db/postgres.ts` | Estado transacional das entidades centrais. |
| **Repositório Cassandra** | `src/server/db/cassandra.ts` | Registro de eventos de telemetria e agregação de visualizações. |
| **Barramento de Integração** | `src/server/bus/integration-bus.ts` | Despacho sincronizado com controle de `correlationId` e formato UUID. |
| **Serviços de Negócio** | `src/server/services/*.ts` | Regras de negócio que persistem no Postgres e disparam auditoria ao MongoDB. |
| **Roteador REST** | `src/server/routes/api-handler.ts` | Endpoints REST consumidos pelo Frontend. |
| **Cliente de API** | `src/services/api.ts` | Comunicação do React com os serviços de banco. |

---

## 3. Fluxos de Negócio Implementados

### 3.1 Ciclo de Vida do Veículo
1. **Cadastro de Veículo**:
   - Cria o registro no PostgreSQL com status `AVAILABLE`.
   - Dispara evento oficial `VEHICLE_CREATED` para o MongoDB com dados iniciais em `newValues`.
2. **Atualização Cadastral / Preço**:
   - Altera campos no PostgreSQL.
   - Dispara `VEHICLE_UPDATED` para o MongoDB com `previousValues` e `newValues` (armazenando apenas o delta modificado).
3. **Mudança de Status**:
   - Altera o status (`AVAILABLE` → `RESERVED` → `SOLD` → `INACTIVE`).
   - Dispara `VEHICLE_STATUS_CHANGED` para o MongoDB.

### 3.2 Ciclo de Vida do Anúncio
1. **Criação**: `ADVERTISEMENT_CREATED` gravado no MongoDB (`status: DRAFT`).
2. **Publicação**: `ADVERTISEMENT_PUBLISHED` gravado no MongoDB (`status: PUBLISHED`).
3. **Pausa / Encerramento**: `ADVERTISEMENT_PAUSED` e `ADVERTISEMENT_ENDED` registrados no MongoDB.
4. **Navegação do Consumidor**:
   - Quando um cliente acessa o anúncio no catálogo público, um evento `ADVERTISEMENT_VIEWED` é registrado no **Apache Cassandra**.

### 3.3 Conclusão de Venda e Operação Correlacionada (`correlationId`)
Quando uma venda é confirmada no painel administrativo:
1. Registra a venda no PostgreSQL com status `COMPLETED`.
2. Atualiza o status do veículo para `SOLD`.
3. Dispara evento `SALE_COMPLETED` no MongoDB com `correlationId`.
4. Dispara evento em cascata `VEHICLE_STATUS_CHANGED` no MongoDB compartilhando o **mesmo `correlationId`**.
5. Dispara evento `ADVERTISEMENT_ENDED` no MongoDB fechando o ciclo.
*Dessa forma, qualquer auditoria de compliance consegue reconstruir todas as etapas da transação através de uma única busca por `correlationId`.*

---

## 4. Telas Conectadas no Painel Administrativo

Ao navegar pelo protótipo (`App.tsx`):

1. **Aba "Auditoria"**:
   - Conectada diretamente ao MongoDB.
   - Lista os eventos reais em ordem cronológica reversa.
   - Permite filtrar pelos 12 tipos de eventos do catálogo oficial.
   - Ao clicar em um evento, o painel de inspeção exibe o documento JSON/BSON com os deltas (`previousValues` vs `newValues`) e o UUID único (`eventId`).
2. **Aba "Cadastro de veículo"**:
   - O botão "Salvar veículo" persiste no PostgreSQL e gera o evento `VEHICLE_CREATED` no MongoDB.
3. **Aba "Anúncios"**:
   - Ações de "Publicar", "Pausar" e "Encerrar" geram imediatamente os eventos no MongoDB.
4. **Aba "Disponibilidade e CAP"**:
   - Exibe o status de saúde e métricas de conectividade dos três bancos (PostgreSQL, MongoDB e Cassandra).
   - O botão "Executar teste de integração tri-banco" simula um fluxo de venda ponta a ponta correlacionado.

---

## 5. Como Executar a Aplicação

### Modo Desenvolvimento Completo:
```bash
cd "AutoDealer Analytics Design"

# Iniciar o servidor Vite com a aplicação Full-Stack
pnpm dev
# ou
npm run dev
```

Acesse no navegador: `http://localhost:8443` (ou a porta informada pelo Vite).

### Conexão com MongoDB Local ou Docker:
Por padrão, a aplicação se conecta automaticamente ao MongoDB caso exista uma instância rodando em `mongodb://localhost:27017`. Caso contrário, opera com o repositório em memória resiliente mantendo todos os contratos de validação e esquemas ativos.

Para subir uma instância local via Docker:
```bash
docker run -d --name autodealer-mongo -p 27017:27017 mongo:7.0
```
