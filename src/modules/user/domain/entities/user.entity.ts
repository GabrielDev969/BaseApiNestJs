import { Role } from "../enums/role.enum";

 
export class User {
constructor(
    public readonly id: string,
    public email: string,
    public password: string,
    public name: string,
    public role: Role = Role.USER,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
) {}
}