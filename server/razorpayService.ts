import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export interface RazorpayOrderOptions {
  amount: number; // Amount in paise (multiply by 100)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Create a Razorpay order for payment
 * @param options Order options including amount, currency, receipt
 * @returns Razorpay order object
 */
export async function createRazorpayOrder(
  options: RazorpayOrderOptions
): Promise<RazorpayOrder> {
  try {
    const orderOptions = {
      amount: options.amount, // amount in paise
      currency: options.currency || 'INR',
      receipt: options.receipt || `receipt_${Date.now()}`,
      notes: options.notes || {},
    };

    console.log('Creating Razorpay order with options:', orderOptions);

    const order = await razorpay.orders.create(orderOptions);
    
    console.log('Razorpay order created:', order.id);
    
    return order as RazorpayOrder;
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
}

/**
 * Verify Razorpay payment signature
 * @param verification Payment verification data from frontend
 * @returns boolean indicating if signature is valid
 */
export function verifyRazorpayPayment(
  verification: RazorpayPaymentVerification
): boolean {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verification;

    // Generate signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    console.log('Verifying Razorpay payment:');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    console.log('Received Signature:', razorpay_signature);
    console.log('Generated Signature:', generatedSignature);

    const isValid = generatedSignature === razorpay_signature;
    
    if (isValid) {
      console.log('✅ Payment signature verified successfully');
    } else {
      console.log('❌ Payment signature verification failed');
    }

    return isValid;
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 * @param paymentId Razorpay payment ID
 * @returns Payment details
 */
export async function fetchRazorpayPayment(paymentId: string) {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    console.log('Fetched payment details:', payment);
    return payment;
  } catch (error: any) {
    console.error('Error fetching Razorpay payment:', error);
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
}

/**
 * Refund a payment
 * @param paymentId Razorpay payment ID
 * @param amount Amount to refund in paise (optional, full refund if not provided)
 * @returns Refund details
 */
export async function refundRazorpayPayment(
  paymentId: string,
  amount?: number
) {
  try {
    const refundOptions: any = {};
    if (amount) {
      refundOptions.amount = amount;
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    console.log('Refund processed:', refund);
    return refund;
  } catch (error: any) {
    console.error('Error refunding Razorpay payment:', error);
    throw new Error(`Failed to refund payment: ${error.message}`);
  }
}

/**
 * Check if Razorpay is properly configured
 * @returns boolean indicating if Razorpay credentials are set
 */
export function isRazorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  const configured = !!(keyId && keySecret && keyId.trim() !== '' && keySecret.trim() !== '');
  
  if (!configured) {
    console.warn('⚠️ Razorpay is not properly configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
  } else {
    console.log('✅ Razorpay is configured and ready');
  }
  
  return configured;
}

export default razorpay;