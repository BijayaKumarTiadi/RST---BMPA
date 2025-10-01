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
      // Normalize email
      const normalizedEmail = email.trim().toLowerCase();
      
      // Generate OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      console.log(`Creating OTP for ${normalizedEmail}, purpose: ${purpose}`);

      // Clean up old OTPs for this email and purpose - use LOWER() for comparison
      await executeQuery(
        'DELETE FROM bmpa_otp_verification WHERE LOWER(email) = LOWER(?) AND purpose = ?',
        [normalizedEmail, purpose]
      );

      // Store OTP in database - store original email but we'll compare case-insensitive
      await executeQuery(
        'INSERT INTO bmpa_otp_verification (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
        [normalizedEmail, otp, purpose, expiresAt]
      );

      console.log(`OTP stored for ${normalizedEmail}: ${otp}`);

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

      console.log(`OTP email sent successfully to ${email}`);
      return {
        success: true,
        message: 'OTP sent successfully to your email'
      };

    } catch (error) {
      console.error('Error creating/sending OTP:', error);
      // Check if it's a database connection error
      if ((error as any).code === 'EACCES' || (error as any).code === 'ETIMEDOUT') {
        return {
          success: false,
          message: 'Database connection issue. Please try again in a moment.'
        };
      }
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.'
      };
    }
  }

  // Verify OTP
  async verifyOTP(email: string, otp: string, purpose: 'login' | 'registration'): Promise<{ success: boolean; message: string }> {
    try {
      // Normalize inputs - trim whitespace and convert email to lowercase
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedOtp = otp.trim();
      
      console.log(`Verifying OTP for email: ${normalizedEmail}, purpose: ${purpose}`);
      
      // Find OTP record - also check with LOWER() for email comparison
      const otpRecord = await executeQuerySingle<OTPRecord>(
        `SELECT * FROM bmpa_otp_verification
         WHERE LOWER(email) = LOWER(?) AND otp_code = ? AND purpose = ? AND verified = 0
         ORDER BY created_at DESC LIMIT 1`,
        [normalizedEmail, normalizedOtp, purpose]
      );

      if (!otpRecord) {
        // Try to find if there's any OTP for this email to provide better error message
        const anyOtp = await executeQuerySingle(
          `SELECT * FROM bmpa_otp_verification
           WHERE LOWER(email) = LOWER(?) AND purpose = ? AND verified = 0
           ORDER BY created_at DESC LIMIT 1`,
          [normalizedEmail, purpose]
        );
        
        if (anyOtp) {
          console.log(`OTP mismatch for ${normalizedEmail}. Expected: ${anyOtp.otp_code}, Got: ${normalizedOtp}`);
          return {
            success: false,
            message: 'Invalid OTP code. Please check and try again.'
          };
        }
        
        return {
          success: false,
          message: 'No valid OTP found. Please request a new one.'
        };
      }

      // Check if OTP has expired
      if (new Date() > new Date(otpRecord.expires_at)) {
        console.log(`OTP expired for ${normalizedEmail}. Expired at: ${otpRecord.expires_at}`);
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

      console.log(`OTP verified successfully for ${normalizedEmail}`);
      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('Error verifying OTP:', error);
      // Check if it's a database connection error
      if ((error as any).code === 'EACCES' || (error as any).code === 'ETIMEDOUT') {
        return {
          success: false,
          message: 'Database connection issue. Please try again in a moment.'
        };
      }
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