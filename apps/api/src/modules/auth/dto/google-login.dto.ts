import { IsJWT } from 'class-validator';

export class GoogleLoginDto {
  @IsJWT()
  credential: string;
}
