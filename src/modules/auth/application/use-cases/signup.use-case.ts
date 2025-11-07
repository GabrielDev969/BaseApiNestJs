import { ConflictException, Injectable } from "@nestjs/common";
import { Role, User } from "src/modules/user/domain/entities/user.entity";
import { IUserRepository } from "src/modules/user/domain/repositories/user.repository";
import { SignupDto } from "../../dtos/signup.dto";
import { hash } from 'bcryptjs';
import { PublicUserDto } from "../../dtos/public-user.dto";

@Injectable()
export class SignupUseCase {
    constructor(private readonly users: IUserRepository) {}

    async execute(data: SignupDto): Promise<PublicUserDto> {
        const exists = await this.users.findByEmail(data.email);
        if (exists) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await hash(data.password, 10);
        data.password = passwordHash;

        const user: User = await this.users.createFromSignup( data );
        
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}