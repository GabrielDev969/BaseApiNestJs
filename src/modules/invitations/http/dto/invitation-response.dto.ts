import { ApiProperty } from '@nestjs/swagger';
import { Invitation } from '../../entities/invitation.entity';

export class InvitationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ format: 'uuid' })
  workspaceId: string;

  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty({ format: 'uuid' })
  invitedById: string;

  @ApiProperty({
    description: 'Acceptance token. Only returned on creation.',
    required: false,
  })
  token?: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ nullable: true })
  acceptedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export function toInvitationDto(
  invitation: Invitation,
  options: { includeToken?: boolean } = {},
): InvitationResponseDto {
  return {
    id: invitation.id,
    email: invitation.email,
    workspaceId: invitation.workspaceId,
    roleId: invitation.roleId,
    invitedById: invitation.invitedById,
    ...(options.includeToken ? { token: invitation.token } : {}),
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    createdAt: invitation.createdAt,
  };
}
