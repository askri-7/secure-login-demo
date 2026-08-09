import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {PrismaService} from '@/database/prisma.service';
import * as bcrypt from 'bcryptjs'
import {SignUpDto} from './dto/signup.dto';
import {LoginDto} from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma : PrismaService,
    private jwtService : JwtService,
  ){}
  
  async signUp(signUpDto: SignUpDto): Promise<{ token: string; user: {id: number ; email: string; name: string; role: string} }>{
    const {name , email , password} = signUpDto;

    //check if user exists 
    const existingUser = await this.prisma.user.findUnique({where : {email} });
    // if not exist throw error
    if(existingUser){
        throw  new ConflictException('Email already in use');
    }
   // hash the password
    const hashedPassword = await bcrypt.hash(password,12);
   // create the new user with default role USER
   const user = await  this.prisma.user.create({data: {name , email , password: hashedPassword, role: 'USER'} });

   // generate JWT with role
   const token = this.jwtService.sign({sub: user.id , email: user.email, role: user.role });

 
  return {token , user: {id : user.id , email: user.email, name: user.name, role: user.role} };

}
async login(loginDto: LoginDto): Promise<{ token: string; user:{id:number; email: string; name: string; role: string} }> {
  const {email, password} = loginDto;

  //find user 
  const user = await this.prisma.user.findUnique({
    where: { email}
  });

  if(!user) {
    throw new UnauthorizedException('Invalid email or password');
  }

  //compare password
  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new UnauthorizedException('Invalid email or password');

  }
  // generate JWT with role
  const token  = this.jwtService.sign({sub: user.id , email: user.email, role: user.role});

  return { token , user:  {id: user.id , email: user.email, name: user.name, role: user.role} };
} 
}
