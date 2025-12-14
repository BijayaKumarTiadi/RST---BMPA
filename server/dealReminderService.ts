import { executeQuery, executeQuerySingle } from './database';
import { sendEmail, generateDealReminderEmail, type DealReminderEmailData } from './emailService';

interface DealForReminder {
  TransID: number;
  memberID: number;
  created_by_member_id: number;
  stock_description: string;
  MakeName: string;
  GradeName: string;
  BrandName: string;
  GSM: number;
  Deckle_mm: number;
  grain_mm: number;
  OfferPrice: number;
  OfferUnit: string;
  quantity: number;
  deal_created_at: string;
  reminder_1_sent: number;
  reminder_2_sent: number;
  reminder_3_sent: number;
  seller_email: string;
  seller_name: string;
  company_name: string;
  daysOld: number;
}

interface MemberDeals {
  memberEmail: string;
  memberName: string;
  companyName: string;
  deals: DealForReminder[];
}

class DealReminderService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Start the reminder scheduler (runs every hour)
  startScheduler(intervalMs: number = 60 * 60 * 1000) {
    if (this.intervalId) {
      console.log('⚠️ Reminder scheduler already running');
      return;
    }

    console.log('🔔 Starting deal reminder scheduler...');
    
    // Run immediately on startup
    this.processReminders().catch(err => console.error('Error in initial reminder processing:', err));

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.processReminders().catch(err => console.error('Error processing reminders:', err));
    }, intervalMs);

    console.log(`✅ Reminder scheduler started (interval: ${intervalMs / 1000 / 60} minutes)`);
  }

  // Stop the scheduler
  stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Reminder scheduler stopped');
    }
  }

  // Main processing function
  async processReminders(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ Reminder processing already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Processing deal reminders...', new Date().toISOString());

    try {
      // Process each reminder type
      await this.processReminder(1, 15); // 15-day reminder
      await this.processReminder(2, 30); // 30-day reminder
      await this.processReminder(3, 45); // 45-day reminder (final)
      
      // Deactivate deals older than 45 days that have received all reminders
      await this.deactivateExpiredDeals();

      console.log('✅ Reminder processing completed');
    } catch (error) {
      console.error('❌ Error processing reminders:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Process reminders for a specific day threshold
  private async processReminder(reminderNumber: 1 | 2 | 3, daysThreshold: number): Promise<void> {
    const reminderColumn = `reminder_${reminderNumber}_sent`;
    const previousReminderColumn = reminderNumber > 1 ? `reminder_${reminderNumber - 1}_sent` : null;

    try {
      // Find active deals that need this reminder
      // Deals must be at least X days old and haven't received this reminder yet
      let whereClause = `
        d.StockStatus = 1 
        AND d.${reminderColumn} = 0
        AND DATEDIFF(NOW(), COALESCE(d.deal_updated_at, d.deal_created_at, NOW())) >= ?
      `;

      // For 2nd and 3rd reminders, ensure previous reminder was sent
      if (previousReminderColumn) {
        whereClause += ` AND d.${previousReminderColumn} = 1`;
      }

      const deals = await executeQuery<DealForReminder>(`
        SELECT 
          d.TransID,
          d.memberID,
          d.created_by_member_id,
          d.stock_description,
          COALESCE(m.make_Name, d.Make) as MakeName,
          COALESCE(gr.GradeName, d.Grade) as GradeName,
          COALESCE(b.brandname, d.Brand) as BrandName,
          d.GSM,
          d.Deckle_mm,
          d.grain_mm,
          d.OfferPrice,
          d.OfferUnit,
          d.quantity,
          d.deal_created_at,
          d.deal_updated_at,
          d.reminder_1_sent,
          d.reminder_2_sent,
          d.reminder_3_sent,
          mb.email as seller_email,
          mb.mname as seller_name,
          mb.company_name,
          DATEDIFF(NOW(), COALESCE(d.deal_updated_at, d.deal_created_at, NOW())) as daysOld
        FROM deal_master d
        LEFT JOIN stock_make_master m ON d.Make = m.make_ID
        LEFT JOIN stock_grade gr ON d.Grade = gr.gradeID
        LEFT JOIN stock_brand b ON d.Brand = b.brandID
        LEFT JOIN bmpa_members mb ON COALESCE(d.created_by_member_id, d.memberID) = mb.member_id
        WHERE ${whereClause}
        ORDER BY mb.email, d.deal_created_at DESC
      `, [daysThreshold]);

      if (deals.length === 0) {
        console.log(`📭 No deals need ${daysThreshold}-day reminder`);
        return;
      }

      console.log(`📬 Found ${deals.length} deals for ${daysThreshold}-day reminder`);

      // Group deals by member email
      const memberDealsMap = new Map<string, MemberDeals>();
      
      for (const deal of deals) {
        if (!deal.seller_email) continue;
        
        const email = deal.seller_email.toLowerCase();
        if (!memberDealsMap.has(email)) {
          memberDealsMap.set(email, {
            memberEmail: email,
            memberName: deal.seller_name || 'Seller',
            companyName: deal.company_name || 'Your Company',
            deals: []
          });
        }
        memberDealsMap.get(email)!.deals.push(deal);
      }

      // Send reminder emails to each member
      for (const [email, memberData] of memberDealsMap) {
        await this.sendReminderEmail(memberData, reminderNumber, daysThreshold);
        
        // Mark reminders as sent for this member's deals
        const dealIds = memberData.deals.map(d => d.TransID);
        await this.markReminderSent(dealIds, reminderNumber);
      }

    } catch (error) {
      console.error(`❌ Error processing ${daysThreshold}-day reminders:`, error);
    }
  }

  // Send reminder email to a member
  private async sendReminderEmail(
    memberData: MemberDeals, 
    reminderNumber: 1 | 2 | 3,
    daysThreshold: number
  ): Promise<boolean> {
    try {
      const daysUntilDeactivation = 45 - daysThreshold;
      
      const emailData: DealReminderEmailData = {
        memberName: memberData.memberName,
        memberEmail: memberData.memberEmail,
        companyName: memberData.companyName,
        deals: memberData.deals.map(deal => ({
          TransID: deal.TransID,
          stock_description: deal.stock_description,
          MakeName: deal.MakeName,
          GradeName: deal.GradeName,
          BrandName: deal.BrandName,
          GSM: deal.GSM,
          Deckle_mm: deal.Deckle_mm,
          grain_mm: deal.grain_mm,
          OfferPrice: deal.OfferPrice,
          OfferUnit: deal.OfferUnit,
          quantity: deal.quantity,
          deal_created_at: deal.deal_created_at,
          daysOld: deal.daysOld
        })),
        reminderNumber,
        daysUntilDeactivation
      };

      const htmlContent = generateDealReminderEmail(emailData);
      
      const subjectPrefix = reminderNumber === 3 
        ? '⚠️ FINAL REMINDER' 
        : reminderNumber === 2 
          ? '⏰ Reminder' 
          : '📋 Update Required';
      
      const result = await sendEmail({
        to: memberData.memberEmail,
        subject: `${subjectPrefix}: ${memberData.deals.length} listing(s) need attention - Stock Laabh`,
        html: htmlContent,
        text: `Your ${memberData.deals.length} listing(s) on Stock Laabh need to be updated. Please log in to review and update them before they are deactivated.`
      });

      if (result) {
        console.log(`📧 Sent ${daysThreshold}-day reminder to ${memberData.memberEmail} for ${memberData.deals.length} deals`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to send reminder email to ${memberData.memberEmail}:`, error);
      return false;
    }
  }

  // Mark reminder as sent for deals
  private async markReminderSent(dealIds: number[], reminderNumber: 1 | 2 | 3): Promise<void> {
    if (dealIds.length === 0) return;

    const reminderColumn = `reminder_${reminderNumber}_sent`;
    const placeholders = dealIds.map(() => '?').join(',');

    await executeQuery(`
      UPDATE deal_master 
      SET ${reminderColumn} = 1, 
          last_reminder_sent_at = NOW()
      WHERE TransID IN (${placeholders})
    `, dealIds);

    console.log(`✅ Marked ${dealIds.length} deals as reminder ${reminderNumber} sent`);
  }

  // Deactivate deals that are older than 45 days and have received all 3 reminders
  private async deactivateExpiredDeals(): Promise<void> {
    try {
      // Find deals that have received all 3 reminders and are older than 45 days since last update
      const result = await executeQuery(`
        UPDATE deal_master 
        SET StockStatus = 0,
            deactivated_at = NOW(),
            auto_deleted = 1
        WHERE StockStatus = 1
          AND reminder_1_sent = 1
          AND reminder_2_sent = 1
          AND reminder_3_sent = 1
          AND DATEDIFF(NOW(), COALESCE(deal_updated_at, deal_created_at, NOW())) >= 45
      `);

      const affectedRows = (result as any).affectedRows || 0;
      
      if (affectedRows > 0) {
        console.log(`🗑️ Auto-deactivated ${affectedRows} expired deals`);
      } else {
        console.log('📋 No deals need auto-deactivation');
      }
    } catch (error) {
      console.error('❌ Error deactivating expired deals:', error);
    }
  }

  // Reset reminders when a deal is updated (called from deal update endpoint)
  async resetRemindersOnUpdate(dealId: number): Promise<void> {
    try {
      await executeQuery(`
        UPDATE deal_master 
        SET reminder_1_sent = 0,
            reminder_2_sent = 0,
            reminder_3_sent = 0,
            last_reminder_sent_at = NULL,
            deal_updated_at = NOW()
        WHERE TransID = ?
      `, [dealId]);
      
      console.log(`🔄 Reset reminders for deal ${dealId} after update`);
    } catch (error) {
      console.error(`❌ Error resetting reminders for deal ${dealId}:`, error);
    }
  }

  // Get reminder status for a deal (for API/dashboard)
  async getReminderStatus(dealId: number): Promise<{
    reminder1Sent: boolean;
    reminder2Sent: boolean;
    reminder3Sent: boolean;
    lastReminderAt: string | null;
    daysOld: number;
    daysUntilDeactivation: number;
  } | null> {
    try {
      const deal = await executeQuerySingle(`
        SELECT 
          reminder_1_sent,
          reminder_2_sent,
          reminder_3_sent,
          last_reminder_sent_at,
          DATEDIFF(NOW(), COALESCE(deal_updated_at, deal_created_at, NOW())) as daysOld
        FROM deal_master 
        WHERE TransID = ?
      `, [dealId]);

      if (!deal) return null;

      return {
        reminder1Sent: deal.reminder_1_sent === 1,
        reminder2Sent: deal.reminder_2_sent === 1,
        reminder3Sent: deal.reminder_3_sent === 1,
        lastReminderAt: deal.last_reminder_sent_at,
        daysOld: deal.daysOld,
        daysUntilDeactivation: Math.max(0, 45 - deal.daysOld)
      };
    } catch (error) {
      console.error(`❌ Error getting reminder status for deal ${dealId}:`, error);
      return null;
    }
  }
}

export const dealReminderService = new DealReminderService();

