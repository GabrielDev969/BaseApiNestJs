import {
  Controller,
  Get,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ListSessionsUseCase } from '../use-cases/list-sessions.use-case';
import { RevokeSessionUseCase } from '../use-cases/revoke-session.use-case';
import { RevokeAllSessionsUseCase } from '../use-cases/revoke-all-sessions.use-case';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import type { AccessTokenPayload } from '@modules/auth/services/token.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('auth/sessions')
export class SessionsController {
  constructor(
    private listSessions: ListSessionsUseCase,
    private revokeSession: RevokeSessionUseCase,
    private revokeAllSessions: RevokeAllSessionsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active sessions for the current user' })
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.listSessions.execute(user.id, user.sessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session' })
  revoke(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.revokeSession.execute(id, user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke all sessions except the current one' })
  revokeAll(@CurrentUser() user: AccessTokenPayload) {
    return this.revokeAllSessions.execute(user.id, user.sessionId);
  }
}
