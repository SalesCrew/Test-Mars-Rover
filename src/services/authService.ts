import { API_BASE_URL } from '../config/database';
import type { AuthUser, LoginCredentials } from '../types/auth-types';

class AuthService {
  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    localStorage.removeItem('token');
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return !!localStorage.getItem('token');
  }

  // ============================================================================
  // ADMIN MANAGEMENT METHODS
  // ============================================================================

  /**
   * Get all admin accounts
   */
  async getAllAdmins(): Promise<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
  }>> {
    const response = await fetch(`${API_BASE_URL}/auth/admins`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch admin accounts');
    }

    return await response.json();
  }

  /**
   * Create new admin account
   */
  async createAdmin(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{ id: string; email: string; password: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create admin account');
    }

    return await response.json();
  }

  /**
   * Delete admin account
   */
  async deleteAdmin(adminId: string, requesterId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/admin/${adminId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requesterId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete admin account');
    }
  }

  /**
   * Change password for current user
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to change password');
    }
  }
}

export const authService = new AuthService();
