import { ListOAuthAccountsUseCase } from './list-oauth-accounts.use-case';
import { OAuthAccountsRepository } from '../repositories/oauth-accounts.repository.interface';

describe('ListOAuthAccountsUseCase', () => {
  let accounts: jest.Mocked<OAuthAccountsRepository>;
  let useCase: ListOAuthAccountsUseCase;

  beforeEach(() => {
    accounts = {
      findByUserId: jest.fn(),
    } as unknown as jest.Mocked<OAuthAccountsRepository>;
    useCase = new ListOAuthAccountsUseCase(accounts);
  });

  it('returns mapped accounts (id, provider, createdAt)', async () => {
    accounts.findByUserId.mockResolvedValue([
      {
        id: 'a1',
        provider: 'google',
        userId: 'u1',
        providerAccountId: 'g-1',
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'a2',
        provider: 'github',
        userId: 'u1',
        providerAccountId: 'gh-1',
        createdAt: new Date('2026-01-02'),
      },
    ] as never);

    const result = await useCase.execute('u1');
    expect(accounts.findByUserId).toHaveBeenCalledWith('u1');
    expect(result).toEqual([
      { id: 'a1', provider: 'google', createdAt: new Date('2026-01-01') },
      { id: 'a2', provider: 'github', createdAt: new Date('2026-01-02') },
    ]);
  });
});
