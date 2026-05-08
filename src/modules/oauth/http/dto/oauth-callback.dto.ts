import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code returned by the provider' })
  @IsString()
  @IsNotEmpty({ message: 'code is required' })
  code: string;

  @ApiProperty({ description: 'Signed state token issued by the start step' })
  @IsString()
  @IsNotEmpty({ message: 'state is required' })
  state: string;
}
