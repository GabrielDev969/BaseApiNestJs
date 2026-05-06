import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString, IsNotEmpty } from 'class-validator';

export class VerifyTwoFactorDto {
  @ApiProperty({ description: 'Challenge token recebido no login' })
  @IsJWT()
  challenge: string;

  @ApiProperty({
    example: '123456',
    description:
      'Código TOTP de 6 dígitos OU código de recuperação (XXXXX-XXXXX)',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
