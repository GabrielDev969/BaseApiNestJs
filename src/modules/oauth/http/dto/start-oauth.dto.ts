import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class StartOAuthDto {
  @ApiPropertyOptional({
    description: 'Where the frontend should redirect after callback',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'redirectUri must be a valid URL' })
  redirectUri?: string;
}
