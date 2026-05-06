import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiPropertyOptional({ format: 'uuid' })
  userId: string | null;

  @ApiProperty({ example: 'user.created' })
  action: string;

  @ApiPropertyOptional({ example: 'User' })
  resource: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  resourceId: string | null;

  @ApiPropertyOptional()
  metadata: Record<string, any> | null;

  @ApiPropertyOptional()
  ipAddress: string | null;

  @ApiPropertyOptional()
  userAgent: string | null;

  @ApiProperty()
  createdAt: Date;
}
