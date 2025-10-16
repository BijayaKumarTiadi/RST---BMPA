import nodemailer from 'nodemailer';

// Email configuration using Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: 'bktiadi1@gmail.com',
    pass: 'jtqq rzdz ecma djoe'
  },
  tls: {
    rejectUnauthorized: false
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
    console.log('Attempting to send email to:', options.to);
    const result = await transporter.sendMail({
      from: '"Stock Laabh" <bktiadi1@gmail.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    console.error('Error details:', {
      code: (error as any)?.code,
      command: (error as any)?.command,
      message: (error as any)?.message
    });
    return false;
  }
}

export function generateOTPEmail(otp: string, purpose: 'login' | 'registration'): string {
  const title = purpose === 'login' ? 'Login Verification' : 'Registration Verification';
  const message = purpose === 'login' 
    ? 'Please use the following OTP to complete your login:'
    : 'Welcome to Stock Laabh! Please use the following OTP to verify your email and complete registration:';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Stock Laabh</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            Stock Laabh
          </h1>
          <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 16px;">
            Professional Trading Platform
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
            © 2025 Stock Laabh. All rights reserved.
          </p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
            Professional Trading Platform
          </p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 11px;">
            Powered by Renuka Print ERP Solutions
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
      <title>Welcome to Stock Laabh</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            Welcome to Stock Laabh!
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
            Thank you for registering with Stock Laabh. Your account has been successfully created and is now pending approval from our admin team.
          </p>

          <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px;">Next Steps:</h3>
            <ul style="color: #047857; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Complete your membership payment (₹2,499)</li>
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
            © 2025 Stock Laabh. All rights reserved.
          </p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
            Professional Trading Platform
          </p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 11px;">
            Powered by Renuka Print ERP Solutions
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateAdminNotificationEmail(memberData: {
  mname: string;
  email: string;
  phone: string;
  company_name: string;
  city: string;
  state: string;
  registrationTime: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New User Registration - Stock Laabh Admin</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            ⚠️ New User Registration
          </h1>
          <p style="color: #fee2e2; margin: 5px 0 0 0; font-size: 16px;">
            Admin Action Required
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
            New Member Awaiting Approval
          </h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            A new user has registered on the Stock Laabh platform and requires your verification and approval.
          </p>

          <!-- User Details -->
          <div style="background-color: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Registration Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 35%;">Name:</td>
                <td style="padding: 8px 0; color: #1f2937;">${memberData.mname}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937;">${memberData.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0; color: #1f2937;">${memberData.phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Company:</td>
                <td style="padding: 8px 0; color: #1f2937;">${memberData.company_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Location:</td>
                <td style="padding: 8px 0; color: #1f2937;">${memberData.city}, ${memberData.state}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Registration Time:</td>
                <td style="padding: 8px 0; color: #1f2937;">${memberData.registrationTime}</td>
              </tr>
            </table>
          </div>

          <!-- Action Required -->
          <div style="background-color: #ecfdf5; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #14532d; margin: 0 0 15px 0; font-size: 18px;">✅ Required Actions:</h3>
            <ol style="color: #166534; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Verify the user's company details and business credentials</li>
              <li style="margin-bottom: 8px;">Check membership payment status (₹2,499 annual fee)</li>
              <li style="margin-bottom: 8px;">Approve or reject the registration in the admin panel</li>
              <li>Update the user's approval status in the system</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://stocklaabh.com/admin/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Go to Admin Dashboard
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center; font-style: italic;">
            Please review and process this registration at your earliest convenience. The user is waiting for approval to access the platform.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            © 2025 Stock Laabh Admin System
          </p>
          <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
            This is an automated notification for admin users only
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateApprovalEmail(memberData: {
  mname: string;
  email: string;
  company_name: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Approved - Stock Laabh</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            🎉 Congratulations!
          </h1>
          <p style="color: #d1fae5; margin: 5px 0 0 0; font-size: 16px;">
            Your Account Has Been Approved
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
            Dear ${memberData.mname},
          </h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Great news! Your Stock Laabh account for <strong>${memberData.company_name}</strong> has been approved by our administration team.
          </p>

          <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
            <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 20px;">✅ Account Status: APPROVED</h3>
            <p style="color: #047857; margin: 0; font-size: 16px;">
              You now have full access to the Stock Laabh marketplace!
            </p>
          </div>

          <h3 style="color: #1f2937; margin: 30px 0 15px 0; font-size: 18px;">🚀 What You Can Do Now:</h3>
          
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <ul style="color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li style="margin-bottom: 10px;">
                <strong style="color: #1e40af;">Browse & Buy:</strong> Explore thousands of products from verified sellers in the printing industry
              </li>
              <li style="margin-bottom: 10px;">
                <strong style="color: #7c3aed;">List Your Products:</strong> Start selling your stock and materials to a wide network of buyers
              </li>
              <li style="margin-bottom: 10px;">
                <strong style="color: #dc2626;">Send Inquiries:</strong> Contact sellers directly for quotes and negotiations
              </li>
              <li style="margin-bottom: 10px;">
                <strong style="color: #059669;">Manage Orders:</strong> Track all your buying and selling activities in one place
              </li>
              <li style="margin-bottom: 10px;">
                <strong style="color: #ea580c;">Access Premium Features:</strong> Enjoy all benefits of your ₹2,499 annual membership
              </li>
            </ul>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://stocklaabh.com/login" 
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
              Login to Your Account
            </a>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Pro Tip:</strong> Complete your company profile and add your first product listing to get maximum visibility in the marketplace.
            </p>
          </div>

          <h3 style="color: #1f2937; margin: 30px 0 15px 0; font-size: 16px;">Need Help Getting Started?</h3>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
            Our support team is here to help! Feel free to reach out to us at:
          </p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 10px 0;">
            <li>Email: <a href="mailto:support@bmpa.org" style="color: #3b82f6;">support@bmpa.org</a></li>
            <li>Phone: Call our admin team during business hours</li>
          </ul>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 35px 0;">

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
            Thank you for joining Stock Laabh. We look forward to supporting your business growth in the printing industry!
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px; font-weight: bold;">
            Welcome to the Stock Laabh Community!
          </p>
          <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
            © 2025 Stock Laabh. All rights reserved.
          </p>
          <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 11px;">
            Powered by Renuka Print ERP Solutions
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export interface InquiryEmailData {
  buyerName: string;
  buyerCompany: string;
  buyerEmail: string;
  buyerPhone: string;
  productId: number;
  productTitle: string;
  productDetails: {
    make?: string;
    grade?: string;
    brand?: string;
    gsm?: number;
    deckle?: number;
    grain?: number;
    sellerPrice: number;
    unit: string;
  };
  buyerQuotedPrice: string;
  quantity: string;
  message: string;
  sellerName: string;
  sellerCompany: string;
}

export function generateInquiryEmail(data: InquiryEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Product Enquiry - Stock Laabh</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            Stock Laabh
          </h1>
          <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 16px;">
            New Product Enquiry
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">
            Hello ${data.sellerName},
          </h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            You have received a new enquiry for your product listing on Stock Laabh marketplace.
          </p>

          <!-- Product Information -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📦 Product Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Product:</td>
                <td style="padding: 8px 0; color: #1f2937;">${data.productTitle || 'Product'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Your Price:</td>
                <td style="padding: 8px 0; color: #1f2937;">₹${data.productDetails.sellerPrice.toLocaleString('en-IN')} per ${data.productDetails.unit}</td>
              </tr>
              ${data.productDetails.make ? `<tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Make:</td><td style="padding: 8px 0; color: #1f2937;">${data.productDetails.make}</td></tr>` : ''}
              ${data.productDetails.grade ? `<tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Grade:</td><td style="padding: 8px 0; color: #1f2937;">${data.productDetails.grade}</td></tr>` : ''}
              ${data.productDetails.brand ? `<tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Brand:</td><td style="padding: 8px 0; color: #1f2937;">${data.productDetails.brand}</td></tr>` : ''}
              ${data.productDetails.deckle && data.productDetails.grain ? `<tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Size:</td><td style="padding: 8px 0; color: #1f2937;">${(data.productDetails.deckle / 10).toFixed(1)} × ${(data.productDetails.grain / 10).toFixed(1)} cm</td></tr>` : ''}
              ${data.productDetails.gsm ? `<tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">GSM:</td><td style="padding: 8px 0; color: #1f2937;">${data.productDetails.gsm}</td></tr>` : ''}
              ${data.quantity ? `<tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Available Quantity:</td><td style="padding: 8px 0; color: #1f2937;">${data.quantity} ${data.productDetails.unit}</td></tr>` : ''}
            </table>
          </div>

          <!-- Buyer Information -->
          <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">👤 Buyer Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #064e3b; font-weight: bold;">Name:</td>
                <td style="padding: 8px 0; color: #1f2937;">${data.buyerName}</td>
              </tr>
              ${data.buyerCompany ? `<tr><td style="padding: 8px 0; color: #064e3b; font-weight: bold;">Company:</td><td style="padding: 8px 0; color: #1f2937;">${data.buyerCompany}</td></tr>` : ''}
              <tr>
                <td style="padding: 8px 0; color: #064e3b; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937;"><a href="mailto:${data.buyerEmail}" style="color: #3b82f6;">${data.buyerEmail}</a></td>
              </tr>
              ${data.buyerPhone ? `<tr><td style="padding: 8px 0; color: #064e3b; font-weight: bold;">Phone:</td><td style="padding: 8px 0; color: #1f2937;"><a href="tel:${data.buyerPhone}" style="color: #3b82f6;">${data.buyerPhone}</a></td></tr>` : ''}
            </table>
          </div>

          <!-- Inquiry Details -->
          <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">💰 Enquiry Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              ${data.buyerQuotedPrice ? `<tr><td style="padding: 8px 0; color: #92400e; font-weight: bold;">Buyer's Quoted Price:</td><td style="padding: 8px 0; color: #1f2937;">₹${data.buyerQuotedPrice}</td></tr>` : ''}
              ${data.quantity ? `<tr><td style="padding: 8px 0; color: #92400e; font-weight: bold;">Quantity Required:</td><td style="padding: 8px 0; color: #1f2937;">${data.quantity} ${data.productDetails.unit}</td></tr>` : ''}
            </table>
            ${data.message ? `
              <div style="margin-top: 15px;">
                <p style="color: #92400e; font-weight: bold; margin: 0 0 8px 0;">Additional Message:</p>
                <p style="color: #1f2937; margin: 0; background-color: #ffffff; padding: 12px; border-radius: 4px; border-left: 4px solid #f59e0b;">${data.message}</p>
              </div>
            ` : ''}
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Please respond to this buyer directly using the contact information provided above.
            </p>
            <a href="mailto:${data.buyerEmail}?subject=Re: Enquiry for ${data.productTitle}"
               style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
              Reply to Buyer
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
            This enquiry was sent through Stock Laabh marketplace. If you have any questions, please contact our support team.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            © 2025 Stock Laabh. All rights reserved.
          </p>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
            Professional Trading Platform
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
