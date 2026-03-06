export interface User {
    id: number;
    username: string;
    email: string;

    createdAt: string;
    lastLoginAt: string;

    isAdmin: boolean;
    isExternalAuth: boolean;

}