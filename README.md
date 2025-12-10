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