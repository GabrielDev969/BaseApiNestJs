import { ApiProperty } from "@nestjs/swagger";
import { PublicUserDto } from "./public-user.dto";

export class LoginResultDto {
  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;

  @ApiProperty({
    description: 'JWT Access Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT Refresh Token',
    example: 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;
}
