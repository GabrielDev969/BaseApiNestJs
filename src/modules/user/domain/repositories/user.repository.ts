import { SignupDto } from "src/modules/auth/dtos/signup.dto";
import { User } from "../entities/user.entity";

export abstract class IUserRepository {
    abstract findByEmail(email: string): Promise<User | null>;
    abstract findById(id: string): Promise<User | null>;
    abstract createFromSignup(data: SignupDto): Promise<User>;
}