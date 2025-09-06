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

  // Get admin by username/email for OTP login
  async getAdminByUsernameOrEmail(identifier: string): Promise<AdminUser | null> {
    try {
      const admin = await executeQuerySingle<AdminUser>(
        'SELECT * FROM admin_users WHERE (username = ? OR email = ?) AND is_active = 1',
        [identifier, identifier]
      );
      return admin;
    } catch (error) {
      console.error('Error getting admin by username/email:', error);
      return null;
    }
  }

  // Send OTP to admin email
  async sendAdminOTP(identifier: string): Promise<{ success: boolean; message: string; email?: string }> {
    try {
      const admin = await this.getAdminByUsernameOrEmail(identifier);
      
      if (!admin) {
        return {
          success: false,
          message: 'Admin not found'
        };
      }

      // Import OTPService here to avoid circular dependency
      const { OTPService } = await import('./otpService');
      const otpService = new OTPService();
      
      const result = await otpService.createAndSendOTP(admin.email, 'login');
      
      if (result.success) {
        return {
          success: true,
          message: 'OTP sent to admin email',
          email: admin.email
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Error sending admin OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP'
      };
    }
  }

  // Verify admin OTP and login
  async verifyAdminOTP(identifier: string, otp: string): Promise<{ success: boolean; message: string; admin?: AdminUser }> {
    try {
      const admin = await this.getAdminByUsernameOrEmail(identifier);
      
      if (!admin) {
        return {
          success: false,
          message: 'Admin not found'
        };
      }

      // Import OTPService here to avoid circular dependency
      const { OTPService } = await import('./otpService');
      const otpService = new OTPService();
      
      const otpResult = await otpService.verifyOTP(admin.email, otp, 'login');
      
      if (!otpResult.success) {
        return {
          success: false,
          message: otpResult.message
        };
      }

      // Update last login
      await executeQuery(
        'UPDATE admin_users SET last_login = NOW() WHERE admin_id = ?',
        [admin.admin_id]
      );

      return {
        success: true,
        message: 'Admin login successful',
        admin
      };

    } catch (error) {
      console.error('Error verifying admin OTP:', error);
      return {
        success: false,
        message: 'OTP verification failed'
      };
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
          role,
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


  // Get single member details
  async getMemberById(memberId: number): Promise<any> {
    try {
      const member = await executeQuerySingle(`
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
          role,
          created_at,
          approval_datetime
        FROM bmpa_members 
        WHERE member_id = ?
      `, [memberId]);
      
      return member;
    } catch (error) {
      console.error('Error getting member by ID:', error);
      return null;
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

  // Update member profile
  async updateMemberProfile(memberId: number, data: {
    mname?: string;
    email?: string;
    phone?: string;
    company_name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
  }): Promise<{ success: boolean; message: string; member?: any }> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      });

      if (updateFields.length === 0) {
        return {
          success: false,
          message: 'No fields to update'
        };
      }

      updateValues.push(memberId);
      
      await executeQuery(
        `UPDATE bmpa_members SET ${updateFields.join(', ')} WHERE member_id = ?`,
        updateValues
      );

      const updatedMember = await executeQuerySingle(
        'SELECT * FROM bmpa_members WHERE member_id = ?',
        [memberId]
      );

      return {
        success: true,
        message: 'Member profile updated successfully',
        member: updatedMember
      };

    } catch (error) {
      console.error('Error updating member profile:', error);
      return {
        success: false,
        message: 'Failed to update member profile'
      };
    }
  }

  // Get payment history
  async getPaymentHistory(): Promise<any[]> {
    try {
      const payments = await executeQuery(`
        SELECT 
          m.member_id,
          m.mname,
          m.email,
          m.company_name,
          m.membership_paid,
          m.membership_valid_till,
          CASE 
            WHEN m.membership_valid_till < NOW() THEN 'Expired'
            WHEN m.membership_valid_till > NOW() THEN 'Active'
            ELSE 'Pending'
          END as membership_status,
          DATEDIFF(m.membership_valid_till, NOW()) as days_remaining,
          m.created_at as payment_date
        FROM bmpa_members m
        WHERE m.membership_paid = 1
        ORDER BY m.membership_valid_till DESC
      `);

      return payments;
    } catch (error) {
      console.error('Error getting payment history:', error);
      return [];
    }
  }

  // Get payment statistics
  async getPaymentStats(): Promise<{
    totalCollected: number;
    activeMembers: number;
    expiredMembers: number;
    expiringThisMonth: number;
  }> {
    try {
      const stats = await executeQuerySingle(`
        SELECT 
          COUNT(CASE WHEN membership_paid = 1 THEN 1 END) * 2499 as totalCollected,
          COUNT(CASE WHEN membership_paid = 1 AND membership_valid_till > NOW() THEN 1 END) as activeMembers,
          COUNT(CASE WHEN membership_paid = 1 AND membership_valid_till < NOW() THEN 1 END) as expiredMembers,
          COUNT(CASE WHEN membership_paid = 1 AND membership_valid_till BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY) THEN 1 END) as expiringThisMonth
        FROM bmpa_members
      `);

      return {
        totalCollected: stats?.totalCollected || 0,
        activeMembers: stats?.activeMembers || 0,
        expiredMembers: stats?.expiredMembers || 0,
        expiringThisMonth: stats?.expiringThisMonth || 0
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      return {
        totalCollected: 0,
        activeMembers: 0,
        expiredMembers: 0,
        expiringThisMonth: 0
      };
    }
  }

  // Update member role
  async updateMemberRole(memberId: number, role: string, adminId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Validate role
      const validRoles = ['buyer', 'seller', 'both', 'admin'];
      if (!validRoles.includes(role)) {
        return {
          success: false,
          message: 'Invalid role. Must be buyer, seller, both, or admin'
        };
      }

      // Update member role
      await executeQuery(
        'UPDATE bmpa_members SET role = ? WHERE member_id = ?',
        [role, memberId]
      );

      return {
        success: true,
        message: 'Member role updated successfully'
      };
    } catch (error) {
      console.error('Error updating member role:', error);
      return {
        success: false,
        message: 'Failed to update member role'
      };
    }
  }
}

export const adminService = new AdminService();