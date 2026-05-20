import { Injectable } from '@nestjs/common';
import { OAuthProviderName } from '../constants/providers';
import { OAuthProviderRegistry } from '../services/oauth-provider-registry';
import {
  OAuthIntent,
  OAuthStateService,
} from '../services/oauth-state.service';

interface StartOAuthInput {
  provider: OAuthProviderName;
  intent: OAuthIntent;
  userId?: string;
  redirectUri?: string;
}

@Injectable()
export class StartOAuthUseCase {
  constructor(
    private registry: OAuthProviderRegistry,
    private state: OAuthStateService,
  ) {}

  async execute(
    input: StartOAuthInput,
  ): Promise<{ authorizationUrl: string; nonce: string }> {
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
