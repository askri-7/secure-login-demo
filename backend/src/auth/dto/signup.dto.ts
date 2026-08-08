import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;
  
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;
}
