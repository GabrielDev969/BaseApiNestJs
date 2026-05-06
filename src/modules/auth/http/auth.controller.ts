import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RegisterUseCase } from '../use-cases/register.use-case';
import { LoginUseCase } from '../use-cases/login.use-case';
import { RefreshTokenUseCase } from '../use-cases/refresh-token.use-case';
import { GetMeUseCase } from '../use-cases/get-me.use-case';
import { SetupTwoFactorUseCase } from '../use-cases/setup-2fa.use-case';
import { EnableTwoFactorUseCase } from '../use-cases/enable-2fa.use-case';
import { DisableTwoFactorUseCase } from '../use-cases/disable-2fa.use-case';
import { VerifyTwoFactorUseCase } from '../use-cases/verify-2fa.use-case';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { EnableTwoFactorDto } from './dto/enable-2fa.dto';
import { DisableTwoFactorDto } from './dto/disable-2fa.dto';
import { VerifyTwoFactorDto } from './dto/verify-2fa.dto';
import { Public } from '@shared/decorators/public.decorator';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../services/token.service';
import type { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private register: RegisterUseCase,
    private login: LoginUseCase,
    private refresh: RefreshTokenUseCase,
    private getMe: GetMeUseCase,
    private setup2fa: SetupTwoFactorUseCase,
    private enable2fa: EnableTwoFactorUseCase,
    private disable2fa: DisableTwoFactorUseCase,
    private verify2fa: VerifyTwoFactorUseCase,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  registerEndpoint(@Body() dto: RegisterDto) {
    return this.register.execute(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user' })
  @ApiResponse({
    status: 200,
    description: 'Login successful or 2FA challenge',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  loginEndpoint(@Body() dto: LoginDto, @Req() req: Request) {
    return this.login.execute({
      ...dto,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token' })
  @ApiResponse({ status: 200, description: 'New tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refreshEndpoint(@Body() dto: RefreshDto) {
    return this.refresh.execute(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Current user profile, workspaces and admin flag' })
  @ApiResponse({ status: 200, type: MeResponseDto })
  meEndpoint(@CurrentUser() user: AccessTokenPayload) {
    return this.getMe.execute(user.id);
  }

  @ApiBearerAuth()
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a 2FA secret (call before enable)' })
  @ApiResponse({ status: 200, description: 'Returns secret and otpauth URL' })
  setup2faEndpoint(@CurrentUser() user: AccessTokenPayload) {
    return this.setup2fa.execute(user.id);
  }

  @ApiBearerAuth()
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate 2FA after verifying first TOTP code' })
  @ApiResponse({
    status: 200,
    description: 'Returns recovery codes (shown once)',
  })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code' })
  enable2faEndpoint(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: EnableTwoFactorDto,
  ) {
    return this.enable2fa.execute(user.id, dto.code);
  }

  @ApiBearerAuth()
  @Post('2fa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable 2FA (requires password and current TOTP)' })
  @ApiResponse({ status: 204, description: '2FA disabled' })
  @ApiResponse({ status: 401, description: 'Invalid password or code' })
  async disable2faEndpoint(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: DisableTwoFactorDto,
  ) {
    await this.disable2fa.execute(user.id, dto.password, dto.code);
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login by verifying 2FA challenge' })
  @ApiResponse({ status: 200, description: 'Tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid challenge or code' })
  verify2faEndpoint(@Body() dto: VerifyTwoFactorDto, @Req() req: Request) {
    return this.verify2fa.execute({
      challenge: dto.challenge,
      code: dto.code,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
  }
}
