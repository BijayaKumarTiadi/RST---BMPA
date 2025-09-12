interface TutorialStep {
  id: string;
  title: string;
  description: string;
  selector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  page?: string;
  mobileSelector?: string;
}

// Tutorial steps for new users
export const newUserTutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Stock Laabh! 🎉",
    description: "Let's take a quick tour to help you get started with our B2B marketplace. You can skip this anytime or restart it from the Help button.",
    position: "center"
  },
  {
    id: "navbar",
    title: "Navigation Menu",
    description: "Use this menu to navigate between different sections of the platform. You can access the marketplace, manage your products, and view your dashboard.",
    selector: "nav",
    mobileSelector: "[data-testid='mobile-menu-button']",
    position: "bottom"
  },
  {
    id: "marketplace",
    title: "Browse Products",
    description: "The marketplace is where you can discover and purchase products from verified sellers. Use filters to find exactly what you need.",
    selector: "[href='/marketplace']",
    position: "bottom",
    page: "/marketplace"
  },
  {
    id: "search",
    title: "Search Products",
    description: "Use the search bar to quickly find specific products. You can search by product name, brand, or category.",
    selector: "input[placeholder*='Search']",
    mobileSelector: "[data-testid='input-mobile-search']",
    position: "bottom"
  },
  {
    id: "filters",
    title: "Filter Options",
    description: "Narrow down your search using filters like Make, Grade, Brand, and GSM. This helps you find the exact specifications you need.",
    selector: ".filter-section",
    mobileSelector: "[data-testid='button-mobile-filter']",
    position: "right"
  },
  {
    id: "product-card",
    title: "Product Information",
    description: "Each product card shows key details like price, quantity, and specifications. Click on a product to see more details.",
    selector: "[data-testid*='card-product']",
    position: "top"
  },
  {
    id: "send-inquiry",
    title: "Send Inquiries",
    description: "Interested in a product? Click 'Send Inquiry' to contact the seller directly with your requirements and questions.",
    selector: "[data-testid*='button-send-inquiry']",
    position: "top"
  }
];

// Tutorial steps for sellers
export const sellerTutorialSteps: TutorialStep[] = [
  {
    id: "welcome-seller",
    title: "Welcome to Your Seller Dashboard! 📊",
    description: "This tour will show you how to manage your products and track your sales effectively.",
    position: "center"
  },
  {
    id: "dashboard-tabs",
    title: "Dashboard Sections",
    description: "Your dashboard has three main sections: Products (manage listings), Inquiries (customer messages), and Orders (confirmed sales).",
    selector: "[role='tablist']",
    position: "bottom",
    page: "/seller-dashboard"
  },
  {
    id: "add-product",
    title: "Add New Products",
    description: "Click here to list a new product for sale. You'll need to provide details like quantity, price, and specifications.",
    selector: "[href='/seller-dashboard/add-product']",
    mobileSelector: "button:has-text('Add Product')",
    position: "bottom"
  },
  {
    id: "product-status",
    title: "Product Status Management",
    description: "You can filter products by status: Active (available for sale), Sold (completed sales), and Inactive (paused listings).",
    selector: "[data-testid='status-filter']",
    position: "bottom"
  },
  {
    id: "inquiries-tab",
    title: "Customer Inquiries",
    description: "View and respond to customer inquiries here. Quick responses lead to more sales!",
    selector: "button:has-text('Inquiries')",
    position: "bottom"
  },
  {
    id: "orders-tab",
    title: "Your Orders",
    description: "Track all your confirmed orders and their status. You can see order details and buyer information.",
    selector: "button:has-text('Orders')",
    position: "bottom"
  },
  {
    id: "edit-product",
    title: "Edit Products",
    description: "Click the edit button on any product to update its details, price, or availability.",
    selector: "[data-testid*='button-edit']",
    position: "left"
  },
  {
    id: "stats",
    title: "Your Statistics",
    description: "Track your performance with key metrics like total products, active listings, and revenue.",
    selector: ".stats-card",
    position: "bottom"
  }
];

// Tutorial steps for admin
export const adminTutorialSteps: TutorialStep[] = [
  {
    id: "welcome-admin",
    title: "Admin Dashboard Overview",
    description: "As an admin, you have access to platform management tools and user oversight capabilities.",
    position: "center"
  },
  {
    id: "admin-menu",
    title: "Admin Navigation",
    description: "Access different admin sections from here: Members, Settings, Reports, and more.",
    selector: "[href='/admin']",
    position: "bottom",
    page: "/admin"
  },
  {
    id: "members-management",
    title: "Manage Members",
    description: "View all registered members, approve new registrations, and manage user accounts.",
    selector: "[data-testid='members-table']",
    position: "bottom"
  },
  {
    id: "approve-users",
    title: "Approve New Users",
    description: "Review and approve pending user registrations. Check their details before granting access.",
    selector: "[data-testid='approve-button']",
    position: "left"
  },
  {
    id: "payment-history",
    title: "Payment Tracking",
    description: "Monitor all membership payments and transaction history across the platform.",
    selector: "button:has-text('Payment History')",
    position: "bottom"
  }
];

// Mobile-specific tutorial
export const mobileTutorialSteps: TutorialStep[] = [
  {
    id: "mobile-welcome",
    title: "Mobile Navigation",
    description: "Stock Laabh is optimized for mobile! Let's explore the mobile-specific features.",
    position: "center"
  },
  {
    id: "mobile-menu",
    title: "Menu Button",
    description: "Tap this button to open the navigation menu and access different sections.",
    selector: "[data-testid='mobile-menu-button']",
    position: "bottom"
  },
  {
    id: "mobile-filters",
    title: "Filter Products",
    description: "Tap the filter button at the bottom to access all filtering options in a mobile-friendly drawer.",
    selector: "[data-testid='button-mobile-filter']",
    position: "top"
  },
  {
    id: "mobile-search",
    title: "Quick Search",
    description: "Use the search bar to find products quickly. It's optimized for touch input.",
    selector: "[data-testid='input-mobile-search']",
    position: "bottom"
  },
  {
    id: "mobile-product-view",
    title: "Product Cards",
    description: "Products are displayed in a grid optimized for mobile screens. Tap any product for details.",
    selector: ".grid",
    position: "top"
  },
  {
    id: "mobile-actions",
    title: "Quick Actions",
    description: "Send inquiries or contact sellers directly from the product cards with these action buttons.",
    selector: "[data-testid*='button-send']",
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