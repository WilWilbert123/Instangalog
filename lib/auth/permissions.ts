import { UserRole } from '@/types/auth';

export function isAdmin(role?: UserRole): boolean {
  return role === 'admin';
}

export function isModeratorOrAdmin(role?: UserRole): boolean {
  return role === 'admin' || role === 'moderator';
}
