import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class LinkOAuthDto {
  @ApiProperty({
    description: 'Current user password (step-up auth for account linking)',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    description: 'Where the frontend should redirect after callback',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false }, { message: 'redirectUri must be a valid URL' })
  redirectUri?: string;
}
