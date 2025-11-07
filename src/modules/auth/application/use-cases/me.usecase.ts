import {  Injectable } from "@nestjs/common";
import { IUserRepository } from "src/modules/user/domain/repositories/user.repository";
import { PublicUserDto } from "../../dtos/public-user.dto";

@Injectable()
export class MeUseCase {
    constructor(private readonly users: IUserRepository) {}

    async execute(userId: string): Promise<PublicUserDto> {
        const user = await this.users.findById(userId);
        if (!user) throw new Error('User not found');
        
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