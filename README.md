# 🚗 Base API

API desenvolvida em NestJS.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [pnpm](https://pnpm.io/) (gerenciador de pacotes)
- [Docker](https://www.docker.com/) e Docker Compose

## 🚀 Como começar

### 1️⃣ Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com as configurações necessárias.

### 2️⃣ Subir o banco de dados

Inicie o banco de dados PostgreSQL usando Docker Compose:

```bash
docker-compose up -d
```

Isso irá iniciar um container PostgreSQL na porta `5432`.

### 3️⃣ Instalar dependências

Instale todas as dependências do projeto:

```bash
pnpm install
```

### 4️⃣ Configurar o banco de dados

Execute as migrações do Prisma para criar as tabelas:

```bash
pnpm prisma migrate dev
```

### 5️⃣ Gerar o cliente Prisma

Gere o cliente Prisma com base no schema:

```bash
pnpm prisma generate
```

### 6️⃣ Popular o banco com dados iniciais

Execute o seed para criar os dados iniciais (usuário admin):

```bash
pnpm prisma db seed
```

> **Nota:** O seed cria um usuário administrador com:
> - **Email:** `admin@example.com`
> - **Senha:** `admin`

### 7️⃣ Iniciar a aplicação

Inicie o servidor em modo de desenvolvimento:

```bash
pnpm run start:dev
```

A API estará rodando em `http://localhost:3000` (ou na porta configurada no `.env`).

## 📚 Scripts disponíveis

```bash
# Desenvolvimento
pnpm run start:dev      # Inicia em modo watch

# Produção
pnpm run build          # Compila o projeto
pnpm run start:prod     # Inicia em modo produção

# Testes
pnpm run test           # Executa testes unitários
pnpm run test:e2e       # Executa testes end-to-end
pnpm run test:cov       # Executa testes com cobertura

# Qualidade de código
pnpm run lint           # Executa o linter
pnpm run format         # Formata o código
```

## 🧪 Testes

O projeto utiliza **testes de integração** com banco de dados PostgreSQL real via Docker, garantindo que os testes simulem o ambiente de produção sem mocks.

### Estrutura de Testes

```
test/
├── jest-e2e.json                    # Configuração do Jest para integração
├── setup.ts                         # Setup global (variáveis de ambiente)
├── helpers/
│   └── prisma-test.helper.ts        # Helpers para gerenciar banco de testes
├── scripts/
│   └── test-e2e.ps1                 # Script para rodar testes completos
└── integration/
    └── auth/
        └── signup.integration.spec.ts
```

### Pré-requisitos

- Docker e Docker Compose instalados
- Arquivo `.env.test` configurado (veja abaixo)

### Configurar ambiente de testes

Crie o arquivo `.env.test` na raiz do projeto:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/my_finance_test"
JWT_ACCESS_SECRET="test-access-secret"
JWT_REFRESH_SECRET="test-refresh-secret"
```

### 🚀 Rodar testes de uma vez (Recomendado)

Para rodar tudo automaticamente (subir banco, aplicar migrations, executar testes e derrubar banco):

```bash
pnpm test:ci
```

Este comando:
1. 🐳 Sobe o container do banco de testes
2. ⏳ Aguarda o banco ficar pronto
3. 📦 Aplica as migrations
4. 🧪 Executa os testes de integração
5. 🧹 Derruba o banco de testes (sempre, mesmo se os testes falharem)

### 📝 Rodar testes passo a passo

Se preferir controlar cada etapa manualmente:

#### 1. Subir o banco de dados de testes

O banco de testes roda na porta **5433** para não conflitar com o banco de desenvolvimento (porta 5432):

```bash
pnpm test:db:up
```

Verificar se está rodando:

```bash
docker compose -f docker-compose.test.yml ps
```

#### 2. Aplicar migrations no banco de testes

Execute as migrations no banco de testes (apenas na primeira vez ou após mudanças no schema):

```bash
pnpm test:db:migrate
```

#### 3. Executar os testes

```bash
pnpm test:e2e
```

Outras opções de testes:

```bash
# Rodar testes com watch mode
pnpm test:watch

# Rodar testes com relatório de cobertura
pnpm test:cov
```

#### 4. Derrubar o banco de testes

Quando terminar, derrube o container:

```bash
pnpm test:db:down
```

### Como funcionam os testes

1. **Antes de todos os testes:** O setup executa as migrations no banco de testes
2. **Antes de cada teste:** Todas as tabelas são limpas automaticamente via `TRUNCATE CASCADE` (busca dinamicamente todas as tabelas)
3. **Durante o teste:** A aplicação NestJS real é inicializada (sem mocks, exatamente como no servidor)
4. **Requisições HTTP:** São feitas via `supertest` simulando chamadas reais à API
5. **Após todos os testes:** Conexões são fechadas e a aplicação é encerrada

### Criando novos testes

Para adicionar um novo teste de integração:

1. Crie o arquivo em `test/integration/<módulo>/<feature>.integration.spec.ts`
2. Importe os helpers do `prisma-test.helper.ts`
3. Use o padrão de `beforeAll` para inicializar a app e `beforeEach` para limpar o banco

Exemplo de estrutura:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from 'src/app.module';
import {
  cleanDatabase,
  disconnectTestDatabase,
  setupTestDatabase,
} from '../../helpers/prisma-test.helper';

describe('Feature (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await setupTestDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
    await app.close();
  });

  it('should do something', async () => {
    const response = await request(app.getHttpServer())
      .post('/endpoint')
      .send({ data: 'test' })
      .expect(200);

    expect(response.body).toMatchObject({ /* expected */ });
  });
});
```

### Troubleshooting de Testes

#### Erro de conexão com o banco

Verifique se o container de testes está rodando:

```bash
docker compose -f docker-compose.test.yml ps
```

Se não estiver, suba novamente:

```bash
pnpm test:db:up
```

#### Testes falhando por dados residuais

Os testes limpam automaticamente o banco antes de cada teste. Se houver problemas, reinicie o container:

```bash
pnpm test:db:down
pnpm test:db:up
pnpm test:db:migrate
```

#### Timeout nos testes

Se os testes estiverem demorando muito, verifique se as migrations foram aplicadas:

```bash
pnpm test:db:migrate
```

#### Erro "Prisma Client not initialized"

Execute o comando para gerar o Prisma Client:

```bash
pnpm prisma generate
```

## 📊 Dashboard de Monitoramento

A API inclui um dashboard simples de monitoramento em tempo real para identificar gargalos de performance, rotas mais lentas, erros e padrões de uso da sua aplicação.

### 🚀 Como Acessar

Após iniciar a aplicação, acesse o dashboard através do navegador:

```
http://localhost:3000/monitoring
```

O dashboard é atualizado automaticamente a cada 10 segundos, mas você também pode clicar no botão "🔄 Atualizar" para atualizar manualmente.

### 📡 Rotas de Monitoramento

As rotas de monitoramento estão disponíveis diretamente na raiz (sem o prefixo `/api/v1`):

#### 1. Dashboard Visual (HTML)

**Rota:** `GET /monitoring`

Retorna uma página HTML completa com o dashboard interativo de monitoramento.

**Exemplo:**
```bash
# Acesse no navegador
http://localhost:3000/monitoring
```

#### 2. API de Dados (JSON)

**Rota:** `GET /monitoring/api/data`

Retorna os dados de monitoramento em formato JSON para integração com outras ferramentas ou consumo programático.

**Exemplo:**
```bash
curl http://localhost:3000/monitoring/api/data
```

**Resposta:**
```json
{
  "overview": {
    "totalRequests": 70,
    "totalErrors": 1,
    "errorRate": 1.43,
    "avgResponseTime": 16,
    "uptime": 378
  },
  "slowestRoutes": [...],
  "mostUsedRoutes": [...],
  "errorRoutes": [...]
}
```

### 📈 Entendendo o Dashboard

O dashboard apresenta as seguintes informações:

#### Visão Geral (Overview)

- **Total de Requisições**: Número total de requisições processadas desde o início da aplicação
- **Tempo Médio (ms)**: Tempo médio de resposta de todas as rotas em milissegundos
- **Erros Totais**: Quantidade total de erros ocorridos
- **Tempo Online**: Tempo que a aplicação está rodando (horas, minutos e segundos)

#### 🐌 Rotas Mais Lentas

Lista as rotas ordenadas por tempo médio de resposta (da mais lenta para a mais rápida), mostrando:
- **Média**: Tempo médio de resposta
- **Máx**: Tempo máximo de resposta registrado
- **Contagem**: Número de vezes que a rota foi chamada
- **Erros**: Quantidade de erros ocorridos nessa rota (se houver)

#### 🔥 Rotas Mais Acessadas

Lista as rotas ordenadas por número de requisições (da mais acessada para a menos acessada), mostrando:
- **Número de requisições**: Quantas vezes a rota foi chamada
- **Tempo médio**: Tempo médio de resposta
- **Erros**: Quantidade de erros (se houver)

#### ⚠️ Rotas com Erros

Exibe apenas as rotas que apresentaram erros, mostrando:
- **Quantidade de erros**: Número de erros ocorridos
- **Taxa de erro**: Percentual de requisições que resultaram em erro
- **Total de requisições**: Número total de chamadas para essa rota

#### 📊 Gráficos de Performance

O dashboard inclui dois gráficos interativos:

1. **Tempo Médio de Resposta por Rota**: Gráfico de barras mostrando o tempo médio de resposta de cada rota
2. **Rotas Mais Acessadas**: Gráfico de barras mostrando o volume de requisições por rota

### 💡 Benefícios do Monitoramento

O dashboard de monitoramento oferece diversos benefícios para o desenvolvimento e manutenção da API:

#### 🎯 Identificação de Gargalos

- **Detecção rápida de problemas**: Identifique imediatamente quais rotas estão mais lentas ou apresentando erros
- **Análise de performance**: Compare o tempo de resposta entre diferentes rotas para priorizar otimizações
- **Monitoramento em tempo real**: Acompanhe a performance da API enquanto ela está em execução

#### 📊 Análise de Uso

- **Padrões de acesso**: Entenda quais rotas são mais utilizadas pelos usuários
- **Distribuição de carga**: Identifique rotas que podem precisar de otimização ou cache
- **Tendências de uso**: Acompanhe como o uso da API evolui ao longo do tempo

#### 🐛 Detecção de Problemas

- **Erros em tempo real**: Veja imediatamente quando e onde erros estão ocorrendo
- **Taxa de erro por rota**: Entenda a confiabilidade de cada endpoint
- **Correlação entre erros e performance**: Identifique se erros estão relacionados a problemas de performance

#### ⚡ Otimização de Performance

- **Priorização de melhorias**: Foque nas rotas mais lentas ou mais acessadas primeiro
- **Validação de otimizações**: Compare métricas antes e depois de implementar melhorias
- **Benchmarking**: Estabeleça métricas de referência para monitorar melhorias contínuas

#### 🔍 Debugging e Troubleshooting

- **Contexto de problemas**: Veja o histórico de requisições e erros quando investigar problemas
- **Análise de padrões**: Identifique padrões que podem indicar problemas sistêmicos
- **Informações para suporte**: Use os dados do dashboard para fornecer informações detalhadas ao time de suporte

### 🎨 Características do Dashboard

- **Interface moderna e intuitiva**: Design limpo e fácil de entender
- **Atualização automática**: Dados atualizados a cada 10 segundos
- **Visualizações interativas**: Gráficos usando Chart.js para análise visual
- **Responsivo**: Funciona bem em diferentes tamanhos de tela
- **Sem dependências externas**: Tudo funciona diretamente na aplicação, sem necessidade de serviços externos

### 📝 Notas Importantes

- Os dados são coletados em memória e são resetados quando a aplicação é reiniciada
- O monitoramento captura automaticamente todas as requisições HTTP através de interceptors
- As métricas incluem tempo de resposta, status codes e contagem de erros
- O dashboard é ideal para ambientes de desenvolvimento e staging, mas pode ser usado em produção com cuidado


## 🛠️ Tecnologias utilizadas

- **NestJS** - Framework Node.js
- **Prisma** - ORM para banco de dados
- **PostgreSQL** - Banco de dados
- **TypeScript** - Linguagem de programação
- **Docker** - Containerização

## 📝 Estrutura do projeto

O projeto segue uma arquitetura limpa com separação de responsabilidades:

```
src/
├── domain/          # Entidades e repositórios
├── application/      # Casos de uso e DTOs
├── interface/        # Controllers HTTP
└── infrastructure/   # Implementações (Prisma, etc.)
```

## 🔧 Comandos úteis do Prisma

```bash
# Visualizar o banco de dados no Prisma Studio
pnpm prisma studio

# Criar uma nova migração
pnpm prisma migrate dev --name nome_da_migracao

# Resetar o banco de dados (cuidado!)
pnpm prisma migrate reset
```
