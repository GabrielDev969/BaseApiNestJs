import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token received on login',
  })
  @IsJWT({ message: 'Invalid refresh token' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
