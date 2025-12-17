import { executeQuery, executeQuerySingle } from './database';

export interface RateRequest {
  request_id: number;
  deal_id: number;
  requester_id: number;
  seller_id: number;
  status: 'pending' | 'approved' | 'denied';
  requester_name: string;
  requester_company: string;
  requester_email: string;
  seller_email: string;
  deal_description: string;
  created_at: Date;
  updated_at: Date;
  decision_at?: Date;
  decision_notes?: string;
}

export interface CreateRateRequestInput {
  deal_id: number;
  requester_id: number;
  seller_id: number;
  requester_name: string;
  requester_company: string;
  requester_email: string;
  seller_email: string;
  deal_description: string;
}

export async function createRateRequest(input: CreateRateRequestInput): Promise<RateRequest> {
  const existingRequest = await executeQuerySingle(`
    SELECT * FROM rate_requests 
    WHERE deal_id = ? AND requester_id = ? AND status = 'pending'
  `, [input.deal_id, input.requester_id]);

  if (existingRequest) {
    throw new Error('You already have a pending rate request for this product');
  }

  const approvedRequest = await executeQuerySingle(`
    SELECT * FROM rate_requests 
    WHERE deal_id = ? AND requester_id = ? AND status = 'approved'
  `, [input.deal_id, input.requester_id]);

  if (approvedRequest) {
    throw new Error('Your rate request has already been approved');
  }

  await executeQuery(`
    INSERT INTO rate_requests 
    (deal_id, requester_id, seller_id, requester_name, requester_company, requester_email, seller_email, deal_description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `, [
    input.deal_id,
    input.requester_id,
    input.seller_id,
    input.requester_name,
    input.requester_company,
    input.requester_email,
    input.seller_email,
    input.deal_description
  ]);

  const newRequest = await executeQuerySingle(`
    SELECT * FROM rate_requests 
    WHERE deal_id = ? AND requester_id = ? AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1
  `, [input.deal_id, input.requester_id]);

  return newRequest as RateRequest;
}

export async function getRateRequestsForSeller(sellerId: number): Promise<RateRequest[]> {
  const requests = await executeQuery(`
    SELECT rr.*, dm.stock_description as deal_title, dm.Make, dm.Grade, dm.Brand, dm.GSM
    FROM rate_requests rr
    LEFT JOIN deal_master dm ON rr.deal_id = dm.TransID
    WHERE rr.seller_id = ?
    ORDER BY rr.created_at DESC
  `, [sellerId]);
  return requests as RateRequest[];
}

export async function getRateRequestsForBuyer(buyerId: number): Promise<RateRequest[]> {
  const requests = await executeQuery(`
    SELECT rr.*, dm.stock_description as deal_title, dm.Make, dm.Grade, dm.Brand, dm.GSM,
           m.company_name as seller_company
    FROM rate_requests rr
    LEFT JOIN deal_master dm ON rr.deal_id = dm.TransID
    LEFT JOIN bmpa_members m ON rr.seller_id = m.member_id
    WHERE rr.requester_id = ?
    ORDER BY rr.created_at DESC
  `, [buyerId]);
  return requests as RateRequest[];
}

export async function getRateRequestById(requestId: number): Promise<RateRequest | null> {
  const request = await executeQuerySingle(`
    SELECT * FROM rate_requests WHERE request_id = ?
  `, [requestId]);
  return request as RateRequest | null;
}

export async function updateRateRequestStatus(
  requestId: number, 
  sellerId: number, 
  status: 'approved' | 'denied',
  notes?: string
): Promise<RateRequest> {
  const request = await getRateRequestById(requestId);
  
  if (!request) {
    throw new Error('Rate request not found');
  }
  
  if (request.seller_id !== sellerId) {
    throw new Error('You are not authorized to update this request');
  }
  
  if (request.status !== 'pending') {
    throw new Error('This request has already been processed');
  }

  await executeQuery(`
    UPDATE rate_requests 
    SET status = ?, decision_at = NOW(), decision_notes = ?
    WHERE request_id = ?
  `, [status, notes || '', requestId]);

  const updatedRequest = await getRateRequestById(requestId);
  return updatedRequest as RateRequest;
}

export async function checkRateApproval(dealId: number, userId: number): Promise<boolean> {
  const approvedRequest = await executeQuerySingle(`
    SELECT * FROM rate_requests 
    WHERE deal_id = ? AND requester_id = ? AND status = 'approved'
  `, [dealId, userId]);
  
  return !!approvedRequest;
}

export async function getRateRequestStatus(dealId: number, userId: number): Promise<'none' | 'pending' | 'approved' | 'denied'> {
  const request = await executeQuerySingle(`
    SELECT status FROM rate_requests 
    WHERE deal_id = ? AND requester_id = ?
    ORDER BY created_at DESC LIMIT 1
  `, [dealId, userId]);
  
  if (!request) {
    return 'none';
  }
  
  return request.status as 'pending' | 'approved' | 'denied';
}

export async function getPendingRequestsCount(sellerId: number): Promise<number> {
  const result = await executeQuerySingle(`
    SELECT COUNT(*) as count FROM rate_requests 
    WHERE seller_id = ? AND status = 'pending'
  `, [sellerId]);
  
  return result?.count || 0;
}
