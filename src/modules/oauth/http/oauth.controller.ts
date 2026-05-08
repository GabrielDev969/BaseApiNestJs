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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '@shared/decorators/public.decorator';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { RateLimit } from '@shared/decorators/rate-limits';
import type { AccessTokenPayload } from '@modules/auth/services/token.service';
import { isOAuthProviderName, OAuthProviderName } from '../constants/providers';
import { StartOAuthUseCase } from '../use-cases/start-oauth.use-case';
import { HandleOAuthCallbackUseCase } from '../use-cases/handle-oauth-callback.use-case';
import { ListOAuthAccountsUseCase } from '../use-cases/list-oauth-accounts.use-case';
import { UnlinkOAuthAccountUseCase } from '../use-cases/unlink-oauth-account.use-case';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { StartOAuthDto } from './dto/start-oauth.dto';

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
  @ApiParam({ name: 'provider', enum: ['google', 'github'] })
  @ApiResponse({ status: 200, description: 'Authorization URL to redirect to' })
  loginStart(
    @Param('provider') providerParam: string,
    @Query() query: StartOAuthDto,
  ) {
    return this.startOAuth.execute({
      provider: parseProvider(providerParam),
      intent: 'login',
      redirectUri: query.redirectUri,
    });
  }

  @ApiBearerAuth()
  @Post(':provider/link')
  @RateLimit('oauthStart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Begin OAuth account linking flow' })
  @ApiParam({ name: 'provider', enum: ['google', 'github'] })
  linkStart(
    @Param('provider') providerParam: string,
    @Body() body: StartOAuthDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.startOAuth.execute({
      provider: parseProvider(providerParam),
      intent: 'link',
      userId: user.id,
      redirectUri: body.redirectUri,
    });
  }

  @Public()
  @Post(':provider/callback')
  @RateLimit('oauthCallback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete OAuth flow with code+state' })
  @ApiParam({ name: 'provider', enum: ['google', 'github'] })
  callback(
    @Param('provider') providerParam: string,
    @Body() body: OAuthCallbackDto,
    @Req() req: Request,
  ) {
    return this.handleCallback.execute({
      provider: parseProvider(providerParam),
      code: body.code,
      state: body.state,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @ApiBearerAuth()
  @Get('accounts')
  @ApiOperation({ summary: "List the current user's linked OAuth accounts" })
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.listAccounts.execute(user.id);
  }

  @ApiBearerAuth()
  @Delete('accounts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink an OAuth account' })
  async unlink(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    await this.unlinkAccount.execute(user.id, id);
  }
}
