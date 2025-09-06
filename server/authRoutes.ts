import express from 'express';
import { authService } from './authService';
import { otpService } from './otpService';
import { adminService } from './adminService';

export const authRouter = express.Router();

// Send OTP for login
authRouter.post('/send-login-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if email exists
    const emailExists = await authService.emailExists(email);
    if (!emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email not found. Please register first or check your email spelling.'
      });
    }

    // Send OTP
    const result = await otpService.createAndSendOTP(email, 'login');
    res.json(result);

  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify OTP and login
authRouter.post('/verify-login-otp', async (req, res) => {
  try {
    console.log('=== NEW CODE RUNNING ===', req.body);
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'OBVIOUSLY NEW CODE - EMAIL AND OTP ONLY REQUIRED'
      });
    }

    // Verify OTP first
    const otpResult = await otpService.verifyOTP(email, otp, 'login');
    if (!otpResult.success) {
      return res.status(400).json(otpResult);
    }

    // Get member by email for OTP-only login
    const member = await authService.getMemberByEmail(email);
    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check member status
    if (member.mstatus === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your membership is pending approval from the admin team'
      });
    }

    // Implement single device login - invalidate other sessions for this user
    // In a production system, this would clear all other sessions for this member
    console.log(`Single device login: Member ${member.member_id} logging in, session: ${req.sessionID}`);
    
    // Store member in session
    (req.session as any).memberId = member.member_id;
    (req.session as any).memberEmail = member.email;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Login failed - session error'
        });
      }

      res.json({
        success: true,
        message: 'Login successful',
        member: {
          id: member.member_id,
          name: member.mname,
          email: member.email,
          phone: member.phone,
          company: member.company_name,
          membershipPaid: member.membership_paid,
          membershipValidTill: member.membership_valid_till,
          status: member.mstatus
        }
      });
    });

  } catch (error) {
    console.error('Verify login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send OTP for registration
authRouter.post('/send-registration-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if email already exists
    const emailExists = await authService.emailExists(email);
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please login instead.'
      });
    }

    // Send OTP
    const result = await otpService.createAndSendOTP(email, 'registration');
    res.json(result);

  } catch (error) {
    console.error('Send registration OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Complete registration with OTP verification
authRouter.post('/complete-registration', async (req, res) => {
  try {
    const { email, otp, registrationData } = req.body;

    if (!email || !otp || !registrationData) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and registration data are required'
      });
    }

    // Verify OTP first
    const otpResult = await otpService.verifyOTP(email, otp, 'registration');
    if (!otpResult.success) {
      return res.status(400).json(otpResult);
    }

    // Complete registration
    const registrationResult = await authService.registerMember({
      ...registrationData,
      email
    });

    res.json(registrationResult);

  } catch (error) {
    console.error('Complete registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current logged-in member
authRouter.get('/current-member', async (req, res) => {
  try {
    if (!(req.session as any).memberId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const member = await authService.getMemberById((req.session as any).memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.json({
      success: true,
      member: {
        id: member.member_id,
        name: member.mname,
        firstName: member.mname, // Also provide as firstName for compatibility
        email: member.email,
        phone: member.phone,
        company: member.company_name,
        address1: member.address1,
        address2: member.address2,
        city: member.city,
        state: member.state,
        membershipPaid: member.membership_paid,
        membershipValidTill: member.membership_valid_till,
        status: member.mstatus,
        last_login: member.last_login,
        role: member.role || 'buyer' // Use role from database, default to buyer
      }
    });

  } catch (error) {
    console.error('Get current member error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Test login with email/password (for development only)
authRouter.post('/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Use direct login method from AuthService
    const result = await authService.loginMember(email, password);
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Store member in session
    (req.session as any).memberId = result.member!.member_id;
    (req.session as any).memberEmail = result.member!.email;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Login failed - session error'
        });
      }

      res.json({
        success: true,
        message: 'Test login successful',
        member: {
          id: result.member!.member_id,
          name: result.member!.mname,
          firstName: result.member!.mname,
          email: result.member!.email,
          phone: result.member!.phone,
          company: result.member!.company_name,
          role: result.member!.role || 'buyer'
        }
      });
    });

  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send admin OTP
authRouter.post('/admin-send-otp', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Username or email is required'
      });
    }

    const otpResult = await adminService.sendAdminOTP(identifier);
    res.json(otpResult);

  } catch (error) {
    console.error('Admin send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin login with OTP
authRouter.post('/admin-login', async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and OTP are required'
      });
    }

    const loginResult = await adminService.verifyAdminOTP(identifier, otp);
    if (!loginResult.success) {
      return res.status(400).json(loginResult);
    }

    // Store admin in session
    (req.session as any).adminId = loginResult.admin!.admin_id;
    (req.session as any).adminUsername = loginResult.admin!.username;
    (req.session as any).adminRole = loginResult.admin!.role;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Login failed - session error'
        });
      }

      res.json({
        success: true,
        message: 'Admin login successful',
        admin: {
          id: loginResult.admin!.admin_id,
          username: loginResult.admin!.username,
          name: loginResult.admin!.full_name,
          email: loginResult.admin!.email,
          role: loginResult.admin!.role
        }
      });
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check admin session
authRouter.get('/admin-user', async (req, res) => {
  try {
    if (!(req.session as any).adminId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const admin = await adminService.getAdminById((req.session as any).adminId);
    if (!admin) {
      // Clear invalid session
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      admin: {
        id: admin.admin_id,
        username: admin.username,
        name: admin.full_name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Get admin user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin logout
authRouter.post('/admin-logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});