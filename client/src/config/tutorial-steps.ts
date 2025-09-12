interface TutorialStep {
  id: string;
  title: string;
  description: string;
  selector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  page?: string;
  mobileSelector?: string;
}

// Essential tutorial steps for all users
export const newUserTutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Stock Laabh",
    description: "This quick guide will show you the essential features of the platform.",
    position: "center"
  },
  {
    id: "marketplace",
    title: "Marketplace",
    description: "Browse and search for products here. Click on any product to view details.",
    selector: "[href='/marketplace']",
    position: "bottom",
    page: "/marketplace"
  },
  {
    id: "send-inquiry",
    title: "Send Inquiries",
    description: "Click 'Send Inquiry' on any product to contact the seller with your requirements.",
    selector: "[data-testid*='button-send-inquiry']",
    position: "top"
  },
  {
    id: "profile",
    title: "Your Profile",
    description: "Access your profile settings and account information here.",
    selector: "[href='/profile']",
    position: "bottom"
  }
];

// Essential tutorial steps for sellers
export const sellerTutorialSteps: TutorialStep[] = [
  {
    id: "welcome-seller",
    title: "Welcome to Stock Laabh",
    description: "This guide will show you the key features for managing your business.",
    position: "center"
  },
  {
    id: "add-product",
    title: "Add Products",
    description: "Click here to add new products for sale. Enter details like price, quantity, and specifications.",
    selector: "[href='/add-product']",
    position: "bottom",
    page: "/seller-dashboard"
  },
  {
    id: "inquiries-tab",
    title: "View Inquiries",
    description: "Check customer inquiries here. Respond quickly to convert inquiries into sales.",
    selector: "[data-testid='tab-inquiries']",
    position: "bottom"
  },
  {
    id: "orders-tab",
    title: "Your Orders",
    description: "Track all confirmed orders and their status here.",
    selector: "[data-testid='tab-counter-offers']",
    position: "bottom"
  },
  {
    id: "marketplace",
    title: "Browse Marketplace",
    description: "View all available products and send inquiries to other sellers.",
    selector: "[href='/marketplace']",
    position: "bottom"
  },
  {
    id: "profile",
    title: "Your Profile",
    description: "Manage your account settings and business information.",
    selector: "[href='/profile']",
    position: "bottom"
  }
];

// Essential tutorial steps for admin
export const adminTutorialSteps: TutorialStep[] = [
  {
    id: "welcome-admin",
    title: "Admin Dashboard",
    description: "Welcome to the admin panel. Here you can manage users and platform settings.",
    position: "center"
  },
  {
    id: "members-management",
    title: "Manage Members",
    description: "View and manage all registered members here.",
    selector: "[data-testid='members-table']",
    position: "bottom",
    page: "/admin"
  },
  {
    id: "payment-history",
    title: "Payment History",
    description: "Track all membership payments and transactions.",
    selector: "[data-testid='tab-payment-history']",
    position: "bottom"
  }
];

// Mobile tutorial - same essential features
export const mobileTutorialSteps: TutorialStep[] = [
  {
    id: "mobile-welcome",
    title: "Welcome to Stock Laabh",
    description: "Here are the essential features on mobile.",
    position: "center"
  },
  {
    id: "mobile-menu",
    title: "Navigation Menu",
    description: "Tap here to access all sections of the platform.",
    selector: "[data-testid='mobile-menu-button']",
    position: "bottom"
  },
  {
    id: "mobile-products",
    title: "Browse Products",
    description: "View available products and tap any product for details.",
    selector: ".grid",
    position: "top"
  },
  {
    id: "mobile-inquiry",
    title: "Send Inquiries",
    description: "Tap 'Send Inquiry' to contact sellers.",
    selector: "[data-testid*='button-send-inquiry']",
    position: "top"
  }
];

// Get appropriate tutorial based on user role and device
export function getTutorialSteps(userRole?: string, isMobile?: boolean): TutorialStep[] {
  if (isMobile) {
    return mobileTutorialSteps;
  }

  switch (userRole) {
    case 'seller':
    case 'both':
      return sellerTutorialSteps;
    case 'admin':
      return adminTutorialSteps;
    case 'buyer':
    default:
      return newUserTutorialSteps;
  }
}

// Tutorial storage keys
export const TUTORIAL_STORAGE_KEYS = {
  NEW_USER: "stocklaabh_tutorial_completed",
  SELLER: "stocklaabh_seller_tutorial_completed",
  ADMIN: "stocklaabh_admin_tutorial_completed",
  MOBILE: "stocklaabh_mobile_tutorial_completed"
};