import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Role } from '../../user/domain/entities/user.entity';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Sarah Connor' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'strong-password' })
  @IsString()
  @MinLength(6)
  password!: string;
}