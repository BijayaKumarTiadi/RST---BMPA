import bcrypt from 'bcryptjs';
import { executeQuery, executeQuerySingle } from './database';

export interface AdminUser {
  admin_id: number;
  username: string;
  password_hash: string;
  full_name: string;
  email: string;
  role: string;
  is_active: number;
  last_login: Date | null;
  created_at: Date;
}

export class AdminService {
  // Verify password
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Admin login
  async loginAdmin(username: string, password: string): Promise<{ success: boolean; message: string; admin?: AdminUser }> {
    try {
      // Get admin user by username
      const admin = await executeQuerySingle<AdminUser>(
        'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
        [username]
      );

      if (!admin) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, admin.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid username or password'
        };
      }

      // Update last login
      await executeQuery(
        'UPDATE admin_users SET last_login = NOW() WHERE admin_id = ?',
        [admin.admin_id]
      );

      return {
        success: true,
        message: 'Login successful',
        admin
      };

    } catch (error) {
      console.error('Error logging in admin:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  // Get admin by ID
  async getAdminById(adminId: number): Promise<AdminUser | null> {
    try {
      const admin = await executeQuerySingle<AdminUser>(
        'SELECT * FROM admin_users WHERE admin_id = ? AND is_active = 1',
        [adminId]
      );
      return admin;
    } catch (error) {
      console.error('Error getting admin by ID:', error);
      return null;
    }
  }

  // Get all members for admin dashboard
  async getAllMembers(): Promise<any[]> {
    try {
      return await executeQuery(`
        SELECT 
          member_id,
          mname,
          email,
          phone,
          company_name,
          city,
          state,
          membership_paid,
          membership_valid_till,
          mstatus,
          created_at,
          approval_datetime
        FROM bmpa_members 
        ORDER BY created_at DESC
      `);
    } catch (error) {
      console.error('Error getting all members:', error);
      return [];
    }
  }

  // Approve member
  async approveMember(memberId: number, adminId: number): Promise<{ success: boolean; message: string }> {
    try {
      await executeQuery(`
        UPDATE bmpa_members 
        SET mstatus = 1, bmpa_approval_id = ?, approval_datetime = NOW()
        WHERE member_id = ?
      `, [adminId, memberId]);

      return {
        success: true,
        message: 'Member approved successfully'
      };
    } catch (error) {
      console.error('Error approving member:', error);
      return {
        success: false,
        message: 'Failed to approve member'
      };
    }
  }

  // Reject member
  async rejectMember(memberId: number, adminId: number): Promise<{ success: boolean; message: string }> {
    try {
      await executeQuery(`
        UPDATE bmpa_members 
        SET mstatus = -1, bmpa_approval_id = ?, approval_datetime = NOW()
        WHERE member_id = ?
      `, [adminId, memberId]);

      return {
        success: true,
        message: 'Member rejected'
      };
    } catch (error) {
      console.error('Error rejecting member:', error);
      return {
        success: false,
        message: 'Failed to reject member'
      };
    }
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<any> {
    try {
      const [totalMembers] = await executeQuery(
        'SELECT COUNT(*) as count FROM bmpa_members'
      );
      
      const [pendingMembers] = await executeQuery(
        'SELECT COUNT(*) as count FROM bmpa_members WHERE mstatus = 0'
      );
      
      const [approvedMembers] = await executeQuery(
        'SELECT COUNT(*) as count FROM bmpa_members WHERE mstatus = 1'
      );
      
      const [rejectedMembers] = await executeQuery(
        'SELECT COUNT(*) as count FROM bmpa_members WHERE mstatus = -1'
      );

      const [paidMembers] = await executeQuery(
        'SELECT COUNT(*) as count FROM bmpa_members WHERE membership_paid = 1'
      );

      return {
        totalMembers: totalMembers.count,
        pendingMembers: pendingMembers.count,
        approvedMembers: approvedMembers.count,
        rejectedMembers: rejectedMembers.count,
        paidMembers: paidMembers.count
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return {
        totalMembers: 0,
        pendingMembers: 0,
        approvedMembers: 0,
        rejectedMembers: 0,
        paidMembers: 0
      };
    }
  }
}

export const adminService = new AdminService();