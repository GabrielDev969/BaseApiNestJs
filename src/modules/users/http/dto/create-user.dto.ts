import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@company.com', maxLength: 255 })
  @IsEmail({}, { message: 'Invalid email' })
  @MaxLength(255)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  email: string;

  @ApiProperty({ example: 'John Doe', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  name: string;

  @ApiProperty({ example: 'StrongPass@123', minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Must contain uppercase letter' })
  @Matches(/[a-z]/, { message: 'Must contain lowercase letter' })
  @Matches(/[0-9]/, { message: 'Must contain a number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Must contain a special character' })
  password: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Role to assign within the workspace',
  })
  @IsUUID('4')
  roleId: string;
}
