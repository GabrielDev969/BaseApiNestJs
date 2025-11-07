// src/users/dto/public-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Role } from 'src/modules/user/domain/enums/role.enum';

export class PublicUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role!: Role;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
