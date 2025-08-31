import { executeQuery, executeQuerySingle } from './database';
import { sendEmail, generateOTPEmail } from './emailService';

export interface OTPRecord {
  id: number;
  email: string;
  otp_code: string;
  purpose: 'login' | 'registration';
  expires_at: Date;
  verified: number;
  created_at: Date;
}

export class OTPService {
  // Generate 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create and send OTP
  async createAndSendOTP(email: string, purpose: 'login' | 'registration'): Promise<{ success: boolean; message: string }> {
    try {
      // Generate OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Clean up old OTPs for this email and purpose
      await executeQuery(
        'DELETE FROM bmpa_otp_verification WHERE email = ? AND purpose = ?',
        [email, purpose]
      );

      // Store OTP in database
      await executeQuery(
        'INSERT INTO bmpa_otp_verification (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
        [email, otp, purpose, expiresAt]
      );

      // Send email
      const emailHtml = generateOTPEmail(otp, purpose);
      const subject = purpose === 'login' 
        ? 'BMPA Login Verification Code' 
        : 'BMPA Registration Verification Code';

      const emailSent = await sendEmail({
        to: email,
        subject,
        html: emailHtml,
        text: `Your BMPA verification code is: ${otp}. This code will expire in 10 minutes.`
      });

      if (!emailSent) {
        throw new Error('Failed to send email');
      }

      return {
        success: true,
        message: 'OTP sent successfully to your email'
      };

    } catch (error) {
      console.error('Error creating/sending OTP:', error);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.'
      };
    }
  }

  // Verify OTP
  async verifyOTP(email: string, otp: string, purpose: 'login' | 'registration'): Promise<{ success: boolean; message: string }> {
    try {
      // Find OTP record
      const otpRecord = await executeQuerySingle<OTPRecord>(
        `SELECT * FROM bmpa_otp_verification 
         WHERE email = ? AND otp_code = ? AND purpose = ? AND verified = 0 
         ORDER BY created_at DESC LIMIT 1`,
        [email, otp, purpose]
      );

      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid OTP code'
        };
      }

      // Check if OTP has expired
      if (new Date() > new Date(otpRecord.expires_at)) {
        return {
          success: false,
          message: 'OTP has expired. Please request a new one.'
        };
      }

      // Mark OTP as verified
      await executeQuery(
        'UPDATE bmpa_otp_verification SET verified = 1 WHERE id = ?',
        [otpRecord.id]
      );

      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        success: false,
        message: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  // Clean up expired OTPs (should be called periodically)
  async cleanupExpiredOTPs(): Promise<void> {
    try {
      await executeQuery(
        'DELETE FROM bmpa_otp_verification WHERE expires_at < NOW()',
        []
      );
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }

  // Check if email has pending verification
  async hasPendingOTP(email: string, purpose: 'login' | 'registration'): Promise<boolean> {
    try {
      const record = await executeQuerySingle(
        `SELECT id FROM bmpa_otp_verification 
         WHERE email = ? AND purpose = ? AND verified = 0 AND expires_at > NOW()`,
        [email, purpose]
      );
      return !!record;
    } catch (error) {
      console.error('Error checking pending OTP:', error);
      return false;
    }
  }
}

export const otpService = new OTPService();