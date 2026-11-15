# AutoDealer Analytics — Checklist para submissão final

## A. Conteúdo

- [ ] Relatório revisado (Word e PDF) — preencher **nomes da equipe e docente**.
- [ ] Slides revisados (PowerPoint e PDF) — inserir integrantes na capa, se necessário.
- [ ] Projeto completo na branch `main`: frontend, backend e `database/`.
- [ ] Scripts PostgreSQL, MongoDB e Cassandra presentes no repositório.
- [ ] Apêndice de comandos reprodutíveis revisado.
- [ ] Resultados de benchmark indicados como **medidos**, não estimados.
- [ ] Limitações experimentais mantidas no relatório/apresentação.

## B. Segurança e versionamento

- [ ] Arquivos `.env` e `backend/.env` **não** foram versionados.
- [ ] Nenhuma senha real, token ou credencial em slides, relatório ou commits.
- [ ] `frontend/node_modules`, `backend/node_modules`, `frontend/dist`, `backend/dist` ignorados.
- [ ] ZIPs antigos de extração não adicionados ao Git (`git add docs/entrega-final` em vez de `git add .`).
- [ ] Pull Request da documentação aprovado e branch `main` sincronizada.
- [ ] Não usar `docker compose down -v`: apagaria os volumes persistentes.

## C. Demonstração (confira no dia)

- [ ] Docker Desktop iniciado e `docker compose ps` mostra PostgreSQL healthy, MongoDB up e Cassandra up.
- [ ] Terminal backend: `npm run dev`, porta 3333.
- [ ] Terminal frontend: `npm run dev`, porta 5173.
- [ ] `GET /health` confirma conexão com 3 bancos.
- [ ] O site público abre e retorna veículos/anúncios.
- [ ] Leads/Agendamentos/Vendas listam registros.
- [ ] Identificou **antes de começar** um lead NEW e uma venda PENDING elegíveis, se for modificar dados ao vivo.
- [ ] Consulta de auditoria MongoDB aparece na interface.
- [ ] Eventos Cassandra aparecem no dashboard após abrir anúncio público.
- [ ] Plano B conhecido caso rede/contêineres falhem.

## D. Observações acadêmicas finais

O laboratório foi local, em contêineres únicos. PostgreSQL: um par de planos; MongoDB: duas rodadas; Cassandra: duas rodadas de 500 leituras, com 1–2 eventos na partição do seed. Essas condições **não** demonstram produção, escalabilidade, failover nem CAP sob partições reais. O Cassandra CQL foi executado em `ONE`; confirmar a configuração usada na cópia efetivamente executada do Python. Os números não comparam a velocidade absoluta de bancos diferentes.
