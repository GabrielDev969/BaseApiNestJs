import { StartOAuthUseCase } from './start-oauth.use-case';
import { OAuthProviderRegistry } from '../services/oauth-provider-registry';
import { OAuthStateService } from '../services/oauth-state.service';

describe('StartOAuthUseCase', () => {
  it('signs state and returns the provider authorization URL', async () => {
    const provider = {
      getAuthorizationUrl: jest
        .fn()
        .mockReturnValue(
          'https://accounts.google.com/o/oauth2/v2/auth?state=signed',
        ),
    };
    const registry = {
      get: jest.fn().mockReturnValue(provider),
    } as unknown as jest.Mocked<OAuthProviderRegistry>;
    const state = {
      sign: jest.fn().mockResolvedValue('signed'),
    } as unknown as jest.Mocked<OAuthStateService>;

    const useCase = new StartOAuthUseCase(registry, state);

    const result = await useCase.execute({
      provider: 'google',
      intent: 'login',
      redirectUri: 'http://app/cb',
    });

    expect(state.sign).toHaveBeenCalledWith({
      provider: 'google',
      intent: 'login',
      userId: undefined,
      redirectUri: 'http://app/cb',
    });
    expect(provider.getAuthorizationUrl).toHaveBeenCalledWith('signed');
    expect(result).toEqual({
      authorizationUrl:
        'https://accounts.google.com/o/oauth2/v2/auth?state=signed',
    });
  });

  it('forwards userId for link intent', async () => {
    const provider = { getAuthorizationUrl: jest.fn().mockReturnValue('url') };
    const registry = {
      get: jest.fn().mockReturnValue(provider),
    } as unknown as jest.Mocked<OAuthProviderRegistry>;
    const state = {
      sign: jest.fn().mockResolvedValue('s'),
    } as unknown as jest.Mocked<OAuthStateService>;

    const useCase = new StartOAuthUseCase(registry, state);

    await useCase.execute({ provider: 'github', intent: 'link', userId: 'u1' });

    expect(state.sign).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'link', userId: 'u1' }),
    );
  });
});
