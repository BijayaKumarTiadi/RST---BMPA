import express from 'express';
import { authService } from './authService';
import { otpService } from './otpService';

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
        message: 'Email not found. Please register first.'
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
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and password are required'
      });
    }

    // Verify OTP first
    const otpResult = await otpService.verifyOTP(email, otp, 'login');
    if (!otpResult.success) {
      return res.status(400).json(otpResult);
    }

    // Then verify login credentials
    const loginResult = await authService.loginMember(email, password);
    if (!loginResult.success) {
      return res.status(400).json(loginResult);
    }

    // Store member in session
    req.session.memberId = loginResult.member!.member_id;
    req.session.memberEmail = loginResult.member!.email;
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
          id: loginResult.member!.member_id,
          name: loginResult.member!.mname,
          email: loginResult.member!.email,
          phone: loginResult.member!.phone,
          company: loginResult.member!.company_name,
          membershipPaid: loginResult.member!.membership_paid,
          membershipValidTill: loginResult.member!.membership_valid_till,
          status: loginResult.member!.mstatus
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
    if (!req.session.memberId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const member = await authService.getMemberById(req.session.memberId);
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
        email: member.email,
        phone: member.phone,
        company: member.company_name,
        address1: member.address1,
        address2: member.address2,
        city: member.city,
        state: member.state,
        membershipPaid: member.membership_paid,
        membershipValidTill: member.membership_valid_till,
        status: member.mstatus
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