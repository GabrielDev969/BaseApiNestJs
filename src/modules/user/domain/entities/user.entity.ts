export enum Role {
    ADMIN = 'ADMIN',
    USER = 'USER',
}
  
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