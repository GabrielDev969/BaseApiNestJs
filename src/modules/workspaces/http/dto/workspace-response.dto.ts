import { ApiProperty } from '@nestjs/swagger';
import { Workspace } from '../../entities/workspace.entity';

export class WorkspaceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  isPersonal: boolean;

  @ApiProperty({ format: 'uuid' })
  ownerId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export function toWorkspaceDto(workspace: Workspace): WorkspaceResponseDto {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    isPersonal: workspace.isPersonal,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };
}
