import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class EnableTwoFactorDto {
  @ApiProperty({
    example: '123456',
    description: 'Código TOTP de 6 dígitos do app autenticador',
  })
  @IsString()
  @Length(6, 6, { message: 'Código deve ter 6 dígitos' })
  code: string;
}
