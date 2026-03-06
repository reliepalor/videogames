export interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
  isAdmin?: boolean;
  isExternalAuth: boolean;
  createdAt: string;
  lastLoginAt: string;
}
