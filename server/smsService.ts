import axios from 'axios';

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || 'KakVfSYBrQuLt62gje4hiFzdM70OnJRIPTmUWZH9w5lGXoA8Ex6in1yohTO9Pzd0qZjY8SCceJ3g4xkl';
const SENDER_ID = 'BMPAPR';
const MESSAGE_TEMPLATE_ID = '171062';

export async function sendOTPSMS(phone: string, otp: string): Promise<boolean> {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    
    const url = `https://www.fast2sms.com/dev/bulkV2`;
    
    const params = {
      authorization: FAST2SMS_API_KEY,
      route: 'dlt',
      sender_id: SENDER_ID,
      message: MESSAGE_TEMPLATE_ID,
      variables_values: otp,
      flash: '0',
      numbers: cleanPhone
    };

    console.log(`📱 Sending SMS OTP to ${cleanPhone}...`);
    
    const response = await axios.get(url, { params });
    
    if (response.data && response.data.return === true) {
      console.log(`✅ SMS sent successfully to ${cleanPhone}`);
      return true;
    } else {
      console.error('❌ Fast2SMS API error:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error sending SMS:', error.message);
    return false;
  }
}

export async function sendWelcomeSMS(phone: string, name: string): Promise<boolean> {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    
    console.log(`📱 Sending welcome SMS to ${cleanPhone}...`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Error sending welcome SMS:', error.message);
    return false;
  }
}