import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length, Matches } from 'class-validator';

export class Verify2FALoginDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User ID (returned from login when 2FA is enabled)',
  })
  @IsUUID('4', { message: 'Invalid ID' })
  userId: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit TOTP code from the authenticator app',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d+$/, { message: 'Code must contain only numbers' })
  code: string;
}
