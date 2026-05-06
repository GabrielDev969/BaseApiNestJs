import { ApiProperty } from '@nestjs/swagger';

export class MeWorkspaceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  isPersonal: boolean;
}

export class MeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  twoFactorEnabled: boolean;

  @ApiProperty({ description: 'True if member of the __admin__ workspace' })
  isSuperAdmin: boolean;

  @ApiProperty({ type: [MeWorkspaceDto] })
  workspaces: MeWorkspaceDto[];
}
