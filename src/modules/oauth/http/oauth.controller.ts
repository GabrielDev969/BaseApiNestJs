import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { setRefreshCookie } from '@modules/auth/http/refresh-cookie';
import { Public } from '@shared/decorators/public.decorator';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { RateLimit } from '@shared/decorators/rate-limits';
import { CryptoUtil } from '@shared/utils/crypto.util';
import {
  clearOAuthStateCookie,
  readOAuthStateCookie,
  setOAuthStateCookie,
} from './oauth-state-cookie';
import {
  ApiAuthErrors,
  ApiNotFoundError,
  ApiRateLimitError,
  ApiServerError,
  ApiValidationError,
} from '@shared/swagger/api-errors.decorator';
import type { AccessTokenPayload } from '@modules/auth/services/token.service';
import { isOAuthProviderName, OAuthProviderName } from '../constants/providers';
import { StartOAuthUseCase } from '../use-cases/start-oauth.use-case';
import { HandleOAuthCallbackUseCase } from '../use-cases/handle-oauth-callback.use-case';
import { ListOAuthAccountsUseCase } from '../use-cases/list-oauth-accounts.use-case';
import { UnlinkOAuthAccountUseCase } from '../use-cases/unlink-oauth-account.use-case';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { StartOAuthDto } from './dto/start-oauth.dto';
import { LinkOAuthDto } from './dto/link-oauth.dto';

function parseProvider(value: string): OAuthProviderName {
  if (!isOAuthProviderName(value)) {
    throw new BadRequestException(`Unsupported OAuth provider "${value}"`);
  }
  return value;
}

@ApiTags('OAuth')
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private startOAuth: StartOAuthUseCase,
    private handleCallback: HandleOAuthCallbackUseCase,
    private listAccounts: ListOAuthAccountsUseCase,
    private unlinkAccount: UnlinkOAuthAccountUseCase,
  ) {}

  @Public()
  @Get(':provider/login')
  @RateLimit('oauthStart')
  @ApiOperation({ summary: 'Begin OAuth login flow' })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'github'],
    description: 'OAuth provider name',
  })
  @ApiResponse({ status: 200, description: 'Authorization URL to redirect to' })
  @ApiValidationError()
  @ApiRateLimitError()
  @ApiServerError()
  async loginStart(
    @Param('provider') providerParam: string,
    @Query() query: StartOAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { authorizationUrl, nonce } = await this.startOAuth.execute({
      provider: parseProvider(providerParam),
      intent: 'login',
      redirectUri: query.redirectUri,
    });
    setOAuthStateCookie(res, CryptoUtil.hashToken(nonce));
    return { authorizationUrl };
  }

  @ApiBearerAuth()
  @Post(':provider/link')
  @RateLimit('oauthStart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Begin OAuth account linking flow' })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'github'],
    description: 'OAuth provider name',
  })
  @ApiBody({ type: LinkOAuthDto })
  @ApiResponse({ status: 200, description: 'Authorization URL to redirect to' })
  @ApiValidationError()
  @ApiAuthErrors()
  @ApiRateLimitError()
  @ApiServerError()
  async linkStart(
    @Param('provider') providerParam: string,
    @Body() body: LinkOAuthDto,
    @CurrentUser() user: AccessTokenPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { authorizationUrl, nonce } = await this.startOAuth.execute({
      provider: parseProvider(providerParam),
      intent: 'link',
      userId: user.id,
      password: body.password,
      redirectUri: body.redirectUri,
    });
    setOAuthStateCookie(res, CryptoUtil.hashToken(nonce));
    return { authorizationUrl };
  }

  @Public()
  @Post(':provider/callback')
  @RateLimit('oauthCallback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete OAuth flow with code+state' })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'github'],
    description: 'OAuth provider name',
  })
  @ApiBody({ type: OAuthCallbackDto })
  @ApiResponse({ status: 200, description: 'Tokens issued or account linked' })
  @ApiValidationError()
  @ApiRateLimitError()
  @ApiServerError()
  async callback(
    @Param('provider') providerParam: string,
    @Body() body: OAuthCallbackDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const expectedNonceHash = readOAuthStateCookie(req);
    try {
      const result = await this.handleCallback.execute({
        provider: parseProvider(providerParam),
        code: body.code,
        state: body.state,
        expectedNonceHash,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });
      if (result.intent === 'login') {
        setRefreshCookie(res, result.refreshToken);
        return { intent: result.intent, accessToken: result.accessToken };
      }
      return result;
    } finally {
      clearOAuthStateCookie(res);
    }
  }

  @ApiBearerAuth()
  @Get('accounts')
  @ApiOperation({ summary: "List the current user's linked OAuth accounts" })
  @ApiResponse({ status: 200, description: 'Linked OAuth accounts' })
  @ApiAuthErrors()
  @ApiServerError()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.listAccounts.execute(user.id);
  }

  @ApiBearerAuth()
  @Delete('accounts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink an OAuth account' })
  @ApiParam({ name: 'id', description: 'Linked OAuth account id' })
  @ApiResponse({ status: 204, description: 'Account unlinked' })
  @ApiAuthErrors()
  @ApiNotFoundError('OAuth account')
  @ApiServerError()
  async unlink(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    await this.unlinkAccount.execute(user.id, id);
  }
}
