import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats posting date with consistent fallback logic and zero-padded day formatting
 * Uses fallback order: deal_created_at || uplaodDate || createdAt
 * Returns "MMM DD, YYYY" format (e.g., "Jan 05, 2025")
 */
export function formatPostingDate(dealOrListing: any): string {
  if (!dealOrListing) return 'N/A';
  
  // Use fallback logic: deal_created_at || uplaodDate || createdAt
  const dateString = dealOrListing.deal_created_at || 
                    dealOrListing.uplaodDate || 
                    dealOrListing.createdAt;
  
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  // Format as "MMM DD, YYYY" with zero-padded day (e.g., "Jan 05, 2025")
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit'  // Ensures zero-padded days
  };
  
  return date.toLocaleDateString('en-US', options);
}
