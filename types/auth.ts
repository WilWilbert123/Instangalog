export type UserRole = 'user' | 'moderator' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface UserSession {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  status: AccountStatus;
}

export interface AuthState {
  user: UserSession | null;
  isLoading: boolean;
  isGuest: boolean;
  showAuthModal: boolean;
  authModalActionText: string;
}
