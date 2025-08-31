import nodemailer from 'nodemailer';

// Email configuration using your Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'bktiadi1@gmail.com',
    pass: 'jtqq rzdz ecma djoe'
  }
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: '"BMPA Stock Exchange" <bktiadi1@gmail.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

export function generateOTPEmail(otp: string, purpose: 'login' | 'registration'): string {
  const title = purpose === 'login' ? 'Login Verification' : 'Registration Verification';
  const message = purpose === 'login' 
    ? 'Please use the following OTP to complete your login:'
    : 'Welcome to BMPA! Please use the following OTP to verify your email and complete registration:';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - BMPA Stock Exchange</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            BMPA Stock Exchange
          </h1>
          <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 16px;">
            Bombay Master Printers Association
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; text-align: center;">
            ${title}
          </h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
            ${message}
          </p>

          <!-- OTP Code -->
          <div style="background-color: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
              Your Verification Code
            </p>
            <div style="font-size: 36px; font-weight: bold; color: #1e40af; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Important:</strong> This OTP will expire in 10 minutes. Please do not share this code with anyone.
            </p>
          </div>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
            If you didn't request this verification, please ignore this email or contact our support team.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            © 2025 BMPA Stock Exchange. All rights reserved.
          </p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
            Bombay Master Printers Association - Connecting the Printing Industry
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateWelcomeEmail(memberName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to BMPA Stock Exchange</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            Welcome to BMPA!
          </h1>
          <p style="color: #d1fae5; margin: 5px 0 0 0; font-size: 16px;">
            Your registration is complete
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
            Hello ${memberName}!
          </h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for registering with BMPA Stock Exchange. Your account has been successfully created and is now pending approval from our admin team.
          </p>

          <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">Next Steps:</h3>
            <ul style="color: #047857; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Complete your membership payment (₹17,700)</li>
              <li style="margin-bottom: 8px;">Wait for admin approval</li>
              <li style="margin-bottom: 8px;">Start exploring the marketplace</li>
              <li>Connect with printing industry professionals</li>
            </ul>
          </div>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
            Once your membership is approved, you'll have full access to:
          </p>

          <div style="display: grid; gap: 15px; margin: 20px 0;">
            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px;">
              <strong style="color: #1e40af;">🏪 Marketplace Access</strong><br>
              <span style="color: #64748b; font-size: 14px;">Buy and sell printing materials with verified members</span>
            </div>
            <div style="background-color: #f8fafc; border-left: 4px solid #8b5cf6; padding: 15px;">
              <strong style="color: #7c3aed;">💬 Direct Messaging</strong><br>
              <span style="color: #64748b; font-size: 14px;">Communicate directly with buyers and sellers</span>
            </div>
            <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 15px;">
              <strong style="color: #059669;">📊 Business Dashboard</strong><br>
              <span style="color: #64748b; font-size: 14px;">Manage your listings, orders, and transactions</span>
            </div>
          </div>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
            If you have any questions, please contact our support team at <a href="mailto:support@bmpa.org" style="color: #3b82f6;">support@bmpa.org</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            © 2025 BMPA Stock Exchange. All rights reserved.
          </p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
            Bombay Master Printers Association - Connecting the Printing Industry
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}