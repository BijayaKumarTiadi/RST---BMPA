import bcrypt from 'bcryptjs';
import { executeQuery, executeQuerySingle } from './database';
import { sendEmail, generateWelcomeEmail } from './emailService';

export interface Member {
  member_id: number;
  mname: string;
  email: string;
  phone: string;
  company_name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  password_hash: string;
  membership_paid: number;
  membership_valid_till: string;
  mstatus: number;
  created_at: Date;
  bmpa_approval_id: number;
  approval_datetime: Date;
}

export interface RegistrationData {
  mname: string;
  email: string;
  phone: string;
  company_name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  password: string;
}

export class AuthService {
  // Hash password
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Check if email exists
  async emailExists(email: string): Promise<boolean> {
    try {
      const member = await executeQuerySingle(
        'SELECT member_id FROM bmpa_members WHERE email = ?',
        [email]
      );
      return !!member;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  // Register new member
  async registerMember(data: RegistrationData): Promise<{ success: boolean; message: string; memberId?: number }> {
    try {
      // Check if email already exists
      const emailExists = await this.emailExists(data.email);
      if (emailExists) {
        return {
          success: false,
          message: 'Email address is already registered'
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Insert new member
      const result = await executeQuery(
        `INSERT INTO bmpa_members (
          mname, email, phone, company_name, address1, address2, 
          city, state, password_hash, mstatus, bmpa_approval_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.mname,
          data.email,
          data.phone,
          data.company_name,
          data.address1,
          data.address2,
          data.city,
          data.state,
          passwordHash,
          0, // mstatus: 0 = pending approval
          0  // bmpa_approval_id: 0 = not approved yet
        ]
      );

      const insertResult = result as any;
      const memberId = insertResult.insertId;

      // Send welcome email
      try {
        const welcomeHtml = generateWelcomeEmail(data.mname);
        await sendEmail({
          to: data.email,
          subject: 'Welcome to Stock Laabh - Registration Complete',
          html: welcomeHtml,
          text: `Welcome to Stock Laabh! Your registration is complete and pending approval.`
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }

      return {
        success: true,
        message: 'Registration successful! Please wait for admin approval.',
        memberId
      };

    } catch (error) {
      console.error('Error registering member:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  // Login member with email/password
  async loginMember(email: string, password: string): Promise<{ success: boolean; message: string; member?: Member }> {
    try {
      // Find member by email
      const member = await executeQuerySingle<Member>(
        'SELECT * FROM bmpa_members WHERE email = ?',
        [email]
      );

      if (!member) {
        return {
          success: false,
          message: 'Email not found. Please check your email or register first.'
        };
      }

      // Verify password
      const passwordValid = await this.verifyPassword(password, member.password_hash);
      if (!passwordValid) {
        return {
          success: false,
          message: 'Invalid password. Please try again.'
        };
      }

      // Check if account is approved
      if (member.mstatus === 0) {
        return {
          success: false,
          message: 'Your account is pending admin approval. Please wait for approval.'
        };
      }

      // Check if membership is paid and valid
      if (member.membership_paid === 0) {
        return {
          success: false,
          message: 'Please complete your membership payment to access the platform.'
        };
      }

      const validTill = new Date(member.membership_valid_till);
      if (validTill < new Date()) {
        return {
          success: false,
          message: 'Your membership has expired. Please renew your membership.'
        };
      }

      return {
        success: true,
        message: 'Login successful',
        member
      };

    } catch (error) {
      console.error('Error during login:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.'
      };
    }
  }

  // Get member by ID
  async getMemberById(memberId: number): Promise<Member | null> {
    try {
      return await executeQuerySingle<Member>(
        'SELECT * FROM bmpa_members WHERE member_id = ?',
        [memberId]
      );
    } catch (error) {
      console.error('Error getting member by ID:', error);
      return null;
    }
  }

  // Get member by email
  async getMemberByEmail(email: string): Promise<Member | null> {
    try {
      return await executeQuerySingle<Member>(
        'SELECT * FROM bmpa_members WHERE email = ?',
        [email]
      );
    } catch (error) {
      console.error('Error getting member by email:', error);
      return null;
    }
  }

  // Update member status (for admin approval)
  async updateMemberStatus(memberId: number, status: number, approvalId: number = 0): Promise<boolean> {
    try {
      await executeQuery(
        'UPDATE bmpa_members SET mstatus = ?, bmpa_approval_id = ?, approval_datetime = NOW() WHERE member_id = ?',
        [status, approvalId, memberId]
      );
      return true;
    } catch (error) {
      console.error('Error updating member status:', error);
      return false;
    }
  }

  // Update membership payment status
  async updateMembershipPayment(memberId: number, paid: number, validTill: string): Promise<boolean> {
    try {
      await executeQuery(
        'UPDATE bmpa_members SET membership_paid = ?, membership_valid_till = ? WHERE member_id = ?',
        [paid, validTill, memberId]
      );
      return true;
    } catch (error) {
      console.error('Error updating membership payment:', error);
      return false;
    }
  }
}

export const authService = new AuthService();