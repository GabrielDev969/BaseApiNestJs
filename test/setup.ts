import 'dotenv/config';

// Carrega variáveis de ambiente de teste
process.env.DATABASE_URL = process.env.DATABASE_URL ||  'postgresql://postgres:postgres@localhost:5433/my_finance_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';