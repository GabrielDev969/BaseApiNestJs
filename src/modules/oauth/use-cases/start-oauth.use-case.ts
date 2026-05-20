import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuthProviderName } from '../constants/providers';
import { OAuthProviderRegistry } from '../services/oauth-provider-registry';
import {
  OAuthIntent,
  OAuthStateService,
} from '../services/oauth-state.service';
import { UsersRepository } from '@modules/users/repositories/users.repository.interface';
import { CryptoUtil } from '@shared/utils/crypto.util';

interface StartOAuthInput {
  provider: OAuthProviderName;
  intent: OAuthIntent;
  userId?: string;
  password?: string;
  redirectUri?: string;
}

@Injectable()
export class StartOAuthUseCase {
  constructor(
    private registry: OAuthProviderRegistry,
    private state: OAuthStateService,
    private users: UsersRepository,
  ) {}

  async execute(
    input: StartOAuthInput,
  ): Promise<{ authorizationUrl: string; nonce: string }> {
    if (input.intent === 'link') {
      if (!input.userId || !input.password) {
        throw new BadRequestException(
          'Linking an OAuth account requires authentication and password',
        );
      }
      const user = await this.users.findById(input.userId);
      if (
        !user ||
        !user.passwordHash ||
        !(await CryptoUtil.verifyPassword(user.passwordHash, input.password))
      ) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    const provider = this.registry.get(input.provider);
    const { state, nonce } = await this.state.sign({
      provider: input.provider,
      intent: input.intent,
      userId: input.userId,
      redirectUri: input.redirectUri,
    });
    return { authorizationUrl: provider.getAuthorizationUrl(state), nonce };
  }
}
