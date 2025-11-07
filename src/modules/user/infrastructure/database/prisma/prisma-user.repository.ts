import { Injectable } from "@nestjs/common";
import { SignupDto } from "src/modules/auth/dtos/signup.dto";
import { Role, User } from "src/modules/user/domain/entities/user.entity";
import { IUserRepository } from "src/modules/user/domain/repositories/user.repository";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return new User(user.id, user.email, user.password, user.name, user.role as Role, user.createdAt, user.updatedAt);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return new User(user.id, user.email, user.password, user.name, user.role as Role, user.createdAt, user.updatedAt);
  }

  async createFromSignup(dto: SignupDto): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: dto.password,
      },
    });
    return new User(user.id, user.email, user.password, user.name, user.role as Role, user.createdAt, user.updatedAt);
  }
}