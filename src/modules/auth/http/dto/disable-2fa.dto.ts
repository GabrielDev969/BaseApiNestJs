import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class DisableTwoFactorDto {
  @ApiProperty({ description: 'Senha atual do usuário' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '123456', description: 'Código TOTP atual' })
  @IsString()
  @Length(6, 6)
  code: string;
}
