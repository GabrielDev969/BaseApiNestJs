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

## 📖 Documentação da API

Se o Swagger estiver configurado, acesse:

```
http://localhost:3000/api
```

## ⚠️ Troubleshooting

### Erro ao conectar no banco de dados

Certifique-se de que o Docker está rodando e o container do banco está ativo:

```bash
docker-compose ps
```

### Erro nas migrações

Se houver problemas com as migrações, você pode resetar o banco:

```bash
pnpm prisma migrate reset
```

Depois execute novamente:

```bash
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma db seed
```