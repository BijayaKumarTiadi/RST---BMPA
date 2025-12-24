import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { Package, Plus, TrendingUp, DollarSign, Users, Eye, Edit2, Trash2, MessageCircle, ShoppingCart, Filter, Search, Calendar, IndianRupee, Clock, X, User, MessageSquare, Mail, UserCog, AlertTriangle, CheckCircle2, Timer, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPostingDate } from "@/lib/utils";

// Rate Requests Tab Component with Received and Sent sub-tabs
function RateRequestsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingRequestId, setPendingRequestId] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'received' | 'sent'>('received');
  
  // Fetch rate requests received by seller
  const { data: receivedRequests, isLoading: isLoadingReceived } = useQuery({
    queryKey: ['/api/rate-requests/seller'],
  });

  // Fetch rate requests sent by buyer
  const { data: sentRequests, isLoading: isLoadingSent } = useQuery({
    queryKey: ['/api/rate-requests/buyer'],
  });

  // Mutation to approve/deny rate requests
  const updateRateRequest = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: number; status: 'approved' | 'denied'; notes?: string }) => {
      setPendingRequestId(requestId);
      const response = await apiRequest('PATCH', `/api/rate-requests/${requestId}`, { status, notes });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(errorData.message || 'Failed to update rate request');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setPendingRequestId(null);
      if (data.success) {
        toast({
          title: data.data.status === 'approved' ? 'Request Approved' : 'Request Denied',
          description: data.data.status === 'approved' 
            ? 'The buyer can now see your rate for this product.' 
            : 'The buyer has been notified.',
        });
        queryClient.invalidateQueries({ queryKey: ['/api/rate-requests/seller'] });
      } else {
        toast({
          title: 'Action Failed',
          description: data.message || 'Failed to update rate request',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      setPendingRequestId(null);
      toast({
        title: 'Action Failed',
        description: error.message || 'Failed to update rate request',
        variant: 'destructive',
      });
    },
  });

  const requests = (receivedRequests as any)?.success !== false ? ((receivedRequests as any)?.data || []) : [];
  const pendingRequests = requests.filter((r: any) => r.status === 'pending');
  const processedRequests = requests.filter((r: any) => r.status !== 'pending');

  const sentRequestsList = (sentRequests as any)?.success !== false ? ((sentRequests as any)?.data || []) : [];
  const pendingSentRequests = sentRequestsList.filter((r: any) => r.status === 'pending');
  const processedSentRequests = sentRequestsList.filter((r: any) => r.status !== 'pending');

  return (
    <TabsContent value="rate-requests" className="space-y-6">
      <Card className="border-2 border-border shadow-lg bg-card">
        <CardHeader className="bg-muted border-b-2 border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Rate Requests
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage rate requests - both received from buyers and sent to sellers
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {pendingRequests.length > 0 && activeSubTab === 'received' && (
                <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                  {pendingRequests.length} Pending
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Sub-tabs for Received and Sent */}
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              onClick={() => setActiveSubTab('received')}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeSubTab === 'received' 
                  ? 'text-primary border-b-2 border-primary -mb-px' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-received-requests"
            >
              Received
              {pendingRequests.length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('sent')}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeSubTab === 'sent' 
                  ? 'text-primary border-b-2 border-primary -mb-px' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-sent-requests"
            >
              Sent
              {pendingSentRequests.length > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingSentRequests.length}
                </span>
              )}
            </button>
          </div>

          {/* Received Requests Tab Content */}
          {activeSubTab === 'received' && (
            <>
              {isLoadingReceived ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No rate requests received</p>
                  <p className="text-sm">When buyers request to see your hidden rates, they will appear here.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pending Requests */}
                  {pendingRequests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-500" />
                        Pending Requests ({pendingRequests.length})
                      </h3>
                      <div className="space-y-3">
                        {pendingRequests.map((request: any) => (
                          <div 
                            key={request.request_id} 
                            className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                            data-testid={`rate-request-${request.request_id}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{request.requester_name}</span>
                                <span className="text-muted-foreground text-sm">from</span>
                                <span className="font-medium">{request.requester_company}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                Requested rate for: <span className="font-medium">{request.deal_description || request.deal_title || `Product #${request.deal_id}`}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {request.created_at ? new Date(request.created_at).toLocaleDateString('en-IN', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Date not available'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => updateRateRequest.mutate({ requestId: request.request_id, status: 'approved' })}
                                disabled={pendingRequestId === request.request_id}
                                data-testid={`button-approve-${request.request_id}`}
                              >
                                {pendingRequestId === request.request_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => updateRateRequest.mutate({ requestId: request.request_id, status: 'denied' })}
                                disabled={pendingRequestId === request.request_id}
                                data-testid={`button-deny-${request.request_id}`}
                              >
                                {pendingRequestId === request.request_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Deny
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Processed Requests */}
                  {processedRequests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                        Processed Requests ({processedRequests.length})
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Requester</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processedRequests.map((request: any) => (
                            <TableRow key={request.request_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{request.requester_name}</p>
                                  <p className="text-xs text-muted-foreground">{request.requester_company}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {request.deal_description || request.deal_title || `Product #${request.deal_id}`}
                              </TableCell>
                              <TableCell>
                                <Badge className={request.status === 'approved' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                }>
                                  {request.status === 'approved' ? (
                                    <><CheckCircle className="h-3 w-3 mr-1" />Approved</>
                                  ) : (
                                    <><XCircle className="h-3 w-3 mr-1" />Denied</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {request.decision_at ? new Date(request.decision_at).toLocaleDateString('en-IN') : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Sent Requests Tab Content */}
          {activeSubTab === 'sent' && (
            <>
              {isLoadingSent ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sentRequestsList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No rate requests sent</p>
                  <p className="text-sm">When you request to see hidden rates from sellers, they will appear here.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pending Sent Requests */}
                  {pendingSentRequests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        Awaiting Response ({pendingSentRequests.length})
                      </h3>
                      <div className="space-y-3">
                        {pendingSentRequests.map((request: any) => (
                          <div 
                            key={request.request_id} 
                            className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                            data-testid={`sent-request-${request.request_id}`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{request.deal_description || request.deal_title || `Product #${request.deal_id}`}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                Seller: <span className="font-medium">{request.seller_company || 'Unknown Seller'}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Requested on: {request.created_at ? new Date(request.created_at).toLocaleDateString('en-IN', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Date not available'}
                              </p>
                            </div>
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Processed Sent Requests */}
                  {processedSentRequests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                        Responded ({processedSentRequests.length})
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Seller</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Response Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processedSentRequests.map((request: any) => (
                            <TableRow key={request.request_id}>
                              <TableCell className="text-sm font-medium">
                                {request.deal_description || request.deal_title || `Product #${request.deal_id}`}
                              </TableCell>
                              <TableCell className="text-sm">
                                {request.seller_company || 'Unknown Seller'}
                              </TableCell>
                              <TableCell>
                                <Badge className={request.status === 'approved' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                }>
                                  {request.status === 'approved' ? (
                                    <><CheckCircle className="h-3 w-3 mr-1" />Approved</>
                                  ) : (
                                    <><XCircle className="h-3 w-3 mr-1" />Denied</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {request.decision_at ? new Date(request.decision_at).toLocaleDateString('en-IN') : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export default function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [inquiryModalOpen, setEnquiryModalOpen] = useState(false);

  // Fetch user settings to get dimension preference
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: isAuthenticated
  });

  // Helper function to calculate relative time
  const getRelativeTime = (dateString: string) => {
    if (!dateString) return 'N/A';

    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    }
  };

  // Helper function to check if group is Kraft Reel
  const isKraftReelGroup = (groupName: string, groupID?: number): boolean => {
    return groupName?.toLowerCase().trim() === 'kraft reel' || groupID === 3;
  };

  // Helper function to format dimensions based on user preference
  const formatDimensions = (deckle_mm?: number, grain_mm?: number, groupName?: string, groupID?: number) => {
    if (!deckle_mm || !grain_mm) return 'N/A';

    const userUnit = (userSettings as any)?.dimension_unit || 'cm';
    const isKraftReel = isKraftReelGroup(groupName || '', groupID);

    if (isKraftReel) {
      // For Kraft Reel: use "," separator and show original grain_mm value with "B.S" suffix
      if (userUnit === 'inch') {
        const deckleInch = (deckle_mm / 25.4).toFixed(2);
        return `${deckleInch}", ${grain_mm} B.S`;
      } else {
        const deckleCm = (deckle_mm / 10).toFixed(1);
        return `${deckleCm}cm, ${grain_mm} B.S`;
      }
    } else {
      // For regular products: use "×" separator and normal conversions
      if (userUnit === 'inch') {
        const deckleInch = (deckle_mm / 25.4).toFixed(2);
        const grainInch = (grain_mm / 25.4).toFixed(2);
        return `${deckleInch}" × ${grainInch}"`;
      } else {
        const deckleCm = (deckle_mm / 10).toFixed(1);
        const grainCm = (grain_mm / 10).toFixed(1);
        return `${deckleCm} × ${grainCm} cm`;
      }
    }
  };

  // Helper function to get product description
  const getProductDescription = (deal: any) => {
    // First try stock_description
    if (deal.stock_description) {
      return deal.stock_description;
    }
    // Then try building from Make, Brand, Grade
    const parts = [];
    if (deal.Make) parts.push(deal.Make);
    if (deal.Brand) parts.push(deal.Brand);
    if (deal.Grade) parts.push(deal.Grade);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    // Fall back to Seller_comments first line if available
    if (deal.Seller_comments) {
      return deal.Seller_comments.split('\n')[0];
    }
    // Finally, use a default
    return `Deal #${deal.TransID}`;
  };


  // Helper function to format stock age from API's StockAge field (days)
  const formatStockAge = (stockAgeDays: number) => {
    if (stockAgeDays === undefined || stockAgeDays === null) return 'N/A';

    if (stockAgeDays === 0) {
      return 'Fresh';
    } else if (stockAgeDays === 1) {
      return '1 day';
    } else if (stockAgeDays < 7) {
      return `${stockAgeDays} days`;
    } else if (stockAgeDays < 30) {
      const weeks = Math.floor(stockAgeDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'}`;
    } else if (stockAgeDays < 365) {
      const months = Math.floor(stockAgeDays / 30);
      return `${months} month${months === 1 ? '' : 's'}`;
    } else {
      const years = Math.floor(stockAgeDays / 365);
      return `${years} year${years === 1 ? '' : 's'}`;
    }
  };

  // Helper function to get listing health status (reminder system)
  const getListingHealthStatus = (deal: any) => {
    const daysUntilDeactivation = deal.days_until_deactivation ?? 45;
    const daysSinceUpdate = deal.days_since_update ?? 0;
    const reminder1Sent = deal.reminder_1_sent === 1;
    const reminder2Sent = deal.reminder_2_sent === 1;
    const reminder3Sent = deal.reminder_3_sent === 1;

    // Determine status color and message
    if (daysUntilDeactivation <= 0 || deal.StockStatus === 0) {
      return {
        color: 'bg-gray-100 text-gray-700 border-gray-300',
        iconColor: 'text-gray-500',
        label: 'Inactive',
        daysLeft: 0,
        urgency: 'inactive',
        reminders: { r1: reminder1Sent, r2: reminder2Sent, r3: reminder3Sent }
      };
    } else if (daysUntilDeactivation <= 7) {
      return {
        color: 'bg-red-100 text-red-700 border-red-300',
        iconColor: 'text-red-500',
        label: `${daysUntilDeactivation}d left`,
        daysLeft: daysUntilDeactivation,
        urgency: 'critical',
        reminders: { r1: reminder1Sent, r2: reminder2Sent, r3: reminder3Sent }
      };
    } else if (daysUntilDeactivation <= 15) {
      return {
        color: 'bg-orange-100 text-orange-700 border-orange-300',
        iconColor: 'text-orange-500',
        label: `${daysUntilDeactivation}d left`,
        daysLeft: daysUntilDeactivation,
        urgency: 'warning',
        reminders: { r1: reminder1Sent, r2: reminder2Sent, r3: reminder3Sent }
      };
    } else if (daysUntilDeactivation <= 30) {
      return {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        iconColor: 'text-yellow-500',
        label: `${daysUntilDeactivation}d left`,
        daysLeft: daysUntilDeactivation,
        urgency: 'attention',
        reminders: { r1: reminder1Sent, r2: reminder2Sent, r3: reminder3Sent }
      };
    } else {
      return {
        color: 'bg-green-100 text-green-700 border-green-300',
        iconColor: 'text-green-500',
        label: `${daysUntilDeactivation}d left`,
        daysLeft: daysUntilDeactivation,
        urgency: 'healthy',
        reminders: { r1: reminder1Sent, r2: reminder2Sent, r3: reminder3Sent }
      };
    }
  };

  // Fetch seller's deals (products)
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/deals", "seller_only"],
    queryFn: async () => {
      const response = await fetch(`/api/deals?seller_only=true`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id,
  });

  // Fetch seller stats
  const { data: statsData } = useQuery({
    queryKey: ["/api/seller/stats"],
    queryFn: async () => {
      const response = await fetch(`/api/seller/stats`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch orders for seller (received inquiries)
  const { data: receivedOrders } = useQuery({
    queryKey: ["/api/orders", "seller"],
    queryFn: async () => {
      const response = await fetch(`/api/orders?role=seller`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch seller orders');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch orders for buyer (sent inquiries)
  const { data: sentOrders } = useQuery({
    queryKey: ["/api/orders", "buyer"],
    queryFn: async () => {
      const response = await fetch(`/api/orders?role=buyer`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch buyer orders');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch inquiries received by seller (new Drizzle-based system)
  const { data: sellerInquiries, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["/api/inquiries/seller"],
    queryFn: async () => {
      const response = await fetch(`/api/inquiries/seller`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch seller inquiries');
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id,
  });

  // Fetch inquiries sent by current user (for Counter Offers tab)
  const { data: buyerInquiries, isLoading: buyerInquiriesLoading } = useQuery({
    queryKey: ["/api/inquiries/buyer"],
    queryFn: async () => {
      const response = await fetch(`/api/inquiries/buyer`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch buyer inquiries');
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id,
  });

  // Mark deal as sold mutation
  const markAsSoldMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest('PUT', `/api/deals/${dealId}/mark-sold`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal marked as sold successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", "seller_only"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/stats"] });
      // Force refetch stats to bypass cache
      queryClient.refetchQueries({ queryKey: ["/api/seller/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark deal as sold",
        variant: "destructive",
      });
    },
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest('DELETE', `/api/deals/${dealId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", "seller_only"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete deal",
        variant: "destructive",
      });
    },
  });

  const deals = dealsData?.deals || [];
  // Combine both received and sent orders
  const receivedOrdersArray = receivedOrders || [];
  const sentOrdersArray = sentOrders || [];
  const allOrders = [...receivedOrdersArray, ...sentOrdersArray];

  // Sort by created_at date (newest first)
  allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Get status text from numeric code
  const getStatusText = (stockStatus: number) => {
    switch (stockStatus) {
      case 0: return 'Inactive';
      case 1: return 'Active';
      case 2: return 'Sold';
      default: return 'Active';
    }
  };

  // Get status color from numeric code
  const getStatusColor = (stockStatus: number) => {
    switch (stockStatus) {
      case 0: return 'bg-gray-100 text-gray-700'; // Inactive
      case 1: return 'bg-green-100 text-green-700'; // Active
      case 2: return 'bg-red-100 text-red-700'; // Sold
      default: return 'bg-green-100 text-green-700';
    }
  };

  // Filter deals based on search and status
  const filteredDeals = deals.filter((deal: any) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" ||
      deal.Seller_comments?.toLowerCase().includes(searchLower) ||
      deal.stock_description?.toLowerCase().includes(searchLower) ||
      deal.GroupName?.toLowerCase().includes(searchLower) ||
      deal.Make?.toLowerCase().includes(searchLower) ||
      deal.Grade?.toLowerCase().includes(searchLower) ||
      deal.Brand?.toLowerCase().includes(searchLower) ||
      deal.GSM?.toString().includes(searchTerm) ||
      deal.Deckle_mm?.toString().includes(searchTerm) ||
      deal.grain_mm?.toString().includes(searchTerm) ||
      deal.TransID.toString().includes(searchTerm) ||
      deal.category_name?.toLowerCase().includes(searchLower);

    const stockStatus = deal.StockStatus || 1; // Default to Active if null
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && stockStatus === 1) ||
      (statusFilter === "sold" && stockStatus === 2) ||
      (statusFilter === "inactive" && stockStatus === 0);

    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to access your seller dashboard.</p>
            <Button onClick={() => setLocation('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  const stats = statsData || { totalProducts: 0, totalDeals: 0, totalOrders: 0, totalRevenue: 0, activeDeals: 0 };

  return (
    <div className="min-h-screen bg-muted">
      <Navigation />

      <div className="w-full px-4 sm:px-6 lg:max-w-7xl lg:mx-auto py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Member Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome back, {user?.mname || user?.name}! Manage your products and track your business.
              </p>
            </div>
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              data-testid="button-add-deal"
            >
              <Link href="/add-product">
                <Plus className="mr-2 h-4 w-4" />
                <span className="text-xs">Add New Deal</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Active Offers</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-active-offers">{stats.activeDeals}</div>
              <p className="text-xs text-green-100 mt-1">
                Currently available
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Offers</CardTitle>
              <Package className="h-5 w-5 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-total-offers">{stats.totalDeals}</div>
              <p className="text-xs text-blue-100 mt-1">
                All time listings
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Sold Offers</CardTitle>
              <ShoppingCart className="h-5 w-5 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="stat-sold-offers">
                {(stats.totalDeals || 0) - (stats.activeDeals || 0)}
              </div>
              <p className="text-xs text-purple-100 mt-1">
                Successfully sold
              </p>
            </CardContent>
          </Card>

          {user?.user_type === 'parent' && (
            <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 cursor-pointer hover:shadow-xl transition-shadow" onClick={() => setLocation('/manage-users')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100">User Management</CardTitle>
                <UserCog className="h-5 w-5 text-indigo-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">Manage</div>
                <p className="text-xs text-indigo-100 mt-1">
                  Child user accounts
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="offers" className="space-y-6">
          <TabsList className="flex w-full md:grid md:grid-cols-4 overflow-x-auto bg-background border shadow-sm gap-1 p-1">
            <TabsTrigger value="offers" className="flex-shrink-0 px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Offers</TabsTrigger>
            <TabsTrigger value="inquiries" className="flex-shrink-0 px-4 data-[state=active]:bg-blue-600 data-[state=active]:text-white">Enquiries</TabsTrigger>
            <TabsTrigger value="counter-offers" className="flex-shrink-0 px-4 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white">Counter Offers</TabsTrigger>
            <TabsTrigger value="rate-requests" className="flex-shrink-0 px-4 whitespace-nowrap data-[state=active]:bg-blue-600 data-[state=active]:text-white">Rate Requests</TabsTrigger>
          </TabsList>

          {/* Offers Tab */}
          <TabsContent value="offers" className="space-y-6">
            {/* Listing Health Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Timer className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Listing Health System</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Listings expire after 45 days without updates. You'll receive reminders at 15, 30, and 45 days.
                    <strong> Update or edit your listings to reset the timer!</strong>
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">30+ days left</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      <span className="text-muted-foreground">15-30 days left</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span className="text-muted-foreground">7-15 days left</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-muted-foreground">&lt;7 days (urgent!)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-2 border-border shadow-lg bg-card">
              <CardHeader className="bg-muted border-b-2 border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">Product Inventory</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Manage your product listings and inventory
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {dealsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : filteredDeals.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {deals.length === 0 ? "No deals yet" : "No matching products"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {deals.length === 0 ? "Start selling by adding your first product" : "Try adjusting your search or filters"}
                    </p>
                    {deals.length === 0 && (
                      <Button asChild className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-first-product">
                        <Link href="/add-product">Add Your First Product</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted border-b-4 border-primary/20">
                            <TableHead className="font-semibold text-foreground">Product</TableHead>
                            <TableHead className="font-semibold text-foreground">Category</TableHead>
                            <TableHead className="font-semibold text-foreground">Specifications</TableHead>
                            <TableHead className="font-semibold text-foreground">Status</TableHead>
                            <TableHead className="font-semibold text-foreground">Listing Health</TableHead>
                            <TableHead className="font-semibold text-foreground">Posted on</TableHead>
                            <TableHead className="font-semibold text-foreground">Stock Age</TableHead>
                            <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDeals.map((deal: any) => (
                            <TableRow
                              key={deal.TransID}
                              className="hover:bg-muted/50 transition-colors"
                              data-testid={`deal-row-${deal.TransID}`}
                            >
                              <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-foreground" data-testid={`deal-title-${deal.TransID}`}>
                                      {getProductDescription(deal)}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium text-foreground">
                                  {deal.GroupName || 'No Category'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1 text-sm">
                                  <div><span className="text-muted-foreground">GSM:</span> <span className="font-medium" data-testid={`deal-gsm-${deal.TransID}`}>{deal.GSM || 'N/A'}</span></div>
                                  <div><span className="text-muted-foreground">Dim:</span> <span className="font-medium">{formatDimensions(deal.Deckle_mm, deal.grain_mm, deal.GroupName, deal.groupID)}</span></div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge
                                    variant="secondary"
                                    className={getStatusColor(deal.StockStatus || 1)}
                                    data-testid={`deal-status-${deal.TransID}`}
                                  >
                                    {getStatusText(deal.StockStatus || 1)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const health = getListingHealthStatus(deal);
                                  return (
                                    <div className="flex flex-col gap-1.5">
                                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${health.color}`}>
                                        {health.urgency === 'critical' && <AlertTriangle className="h-3 w-3" />}
                                        {health.urgency === 'warning' && <Timer className="h-3 w-3" />}
                                        {health.urgency === 'attention' && <Clock className="h-3 w-3" />}
                                        {health.urgency === 'healthy' && <CheckCircle2 className="h-3 w-3" />}
                                        {health.urgency === 'inactive' && <X className="h-3 w-3" />}
                                        <span>{health.label}</span>
                                      </div>
                                      {/* Reminder indicators */}
                                      <div className="flex items-center gap-1" title={`Reminders: ${health.reminders.r1 ? '1st sent' : '1st pending'}, ${health.reminders.r2 ? '2nd sent' : '2nd pending'}, ${health.reminders.r3 ? '3rd sent' : '3rd pending'}`}>
                                        <div className={`w-2 h-2 rounded-full ${health.reminders.r1 ? 'bg-blue-500' : 'bg-gray-200'}`} title={health.reminders.r1 ? '1st reminder sent' : '1st reminder pending'} />
                                        <div className={`w-2 h-2 rounded-full ${health.reminders.r2 ? 'bg-orange-500' : 'bg-gray-200'}`} title={health.reminders.r2 ? '2nd reminder sent' : '2nd reminder pending'} />
                                        <div className={`w-2 h-2 rounded-full ${health.reminders.r3 ? 'bg-red-500' : 'bg-gray-200'}`} title={health.reminders.r3 ? '3rd reminder sent' : '3rd reminder pending'} />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-foreground" title="When offer was created">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {formatPostingDate(deal)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-foreground" title="Actual stock age">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  {formatStockAge(deal.StockAge)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedDeal(deal);
                                      setViewModalOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 hover:bg-blue-100"
                                    data-testid={`button-view-${deal.TransID}`}
                                  >
                                    <Eye className="h-4 w-4 text-blue-600" />
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className="h-8 w-8 p-0 hover:bg-green-100"
                                    data-testid={`button-edit-${deal.TransID}`}
                                  >
                                    <Link href={`/edit-product/${deal.TransID}`}>
                                      <Edit2 className="h-4 w-4 text-green-600" />
                                    </Link>
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => markAsSoldMutation.mutate(deal.TransID.toString())}
                                    disabled={markAsSoldMutation.isPending || (deal.StockStatus || 1) === 2}
                                    className="h-8 px-2 text-xs hover:bg-orange-100 disabled:opacity-50"
                                    data-testid={`button-mark-sold-${deal.TransID}`}
                                  >
                                    <IndianRupee className="h-3 w-3 text-orange-600 mr-1" />
                                    Sold
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this product?')) {
                                        deleteDealMutation.mutate(deal.TransID.toString());
                                      }
                                    }}
                                    disabled={deleteDealMutation.isPending || (deal.StockStatus || 1) === 0}
                                    className="h-8 w-8 p-0 hover:bg-red-100 disabled:opacity-50"
                                    data-testid={`button-delete-${deal.TransID}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                      {filteredDeals.map((deal: any) => (
                        <Card key={deal.TransID} className="border border-border hover:shadow-md transition-shadow" data-testid={`deal-card-${deal.TransID}`}>
                          <CardContent className="p-4">
                            {/* Header with Product Name and Status */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground text-sm leading-tight" data-testid={`deal-title-${deal.TransID}`}>
                                    {getProductDescription(deal)}
                                  </h3>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${getStatusColor(deal.StockStatus || 1)}`}
                                  data-testid={`deal-status-${deal.TransID}`}
                                >
                                  {getStatusText(deal.StockStatus || 1)}
                                </Badge>
                              </div>
                            </div>

                            {/* Category */}
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-1">Category</p>
                              <p className="text-sm font-medium text-foreground">{deal.GroupName || 'No Category'}</p>
                            </div>

                            {/* Listing Health */}
                            {(() => {
                              const health = getListingHealthStatus(deal);
                              return (
                                <div className="mb-3 p-2 rounded-lg border bg-muted/30">
                                  <p className="text-xs text-muted-foreground mb-1.5">Listing Health</p>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${health.color}`}>
                                      {health.urgency === 'critical' && <AlertTriangle className="h-3 w-3" />}
                                      {health.urgency === 'warning' && <Timer className="h-3 w-3" />}
                                      {health.urgency === 'attention' && <Clock className="h-3 w-3" />}
                                      {health.urgency === 'healthy' && <CheckCircle2 className="h-3 w-3" />}
                                      {health.urgency === 'inactive' && <X className="h-3 w-3" />}
                                      <span>{health.label}</span>
                                    </div>
                                    {/* Reminder indicators with labels */}
                                    <div className="flex items-center gap-2 text-xs">
                                      <div className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${health.reminders.r1 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                                        <span className={health.reminders.r1 ? 'text-blue-600' : 'text-muted-foreground'}>1st</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${health.reminders.r2 ? 'bg-orange-500' : 'bg-gray-300'}`} />
                                        <span className={health.reminders.r2 ? 'text-orange-600' : 'text-muted-foreground'}>2nd</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${health.reminders.r3 ? 'bg-red-500' : 'bg-gray-300'}`} />
                                        <span className={health.reminders.r3 ? 'text-red-600' : 'text-muted-foreground'}>3rd</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Product Specifications */}
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-2">Specifications</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">GSM:</span>
                                  <span className="font-medium text-foreground ml-1" data-testid={`deal-gsm-${deal.TransID}`}>
                                    {deal.GSM || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Dim:</span>
                                  <span className="font-medium text-foreground ml-1">
                                    {formatDimensions(deal.Deckle_mm, deal.grain_mm, deal.GroupName, deal.groupID)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Grain:</span>
                                  <span className="font-medium text-foreground ml-1">
                                    {deal.grain_mm}mm
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Deckle:</span>
                                  <span className="font-medium text-foreground ml-1">
                                    {deal.Deckle_mm}mm
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Posted and Stock Age */}
                            <div className="mb-4">
                              <p className="text-xs text-muted-foreground mb-2">Posted/Stock Age</p>
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1 text-xs text-foreground" title="When offer was created">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span>{formatPostingDate(deal)}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-foreground" title="Actual stock age">
                                    <Package className="h-3 w-3 text-muted-foreground" />
                                    <span>{formatStockAge(deal.StockAge)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-3 border-t border-border">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDeal(deal);
                                  setViewModalOpen(true);
                                }}
                                className="flex-1 text-xs"
                                data-testid={`button-view-${deal.TransID}`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                className="flex-1 text-xs"
                                data-testid={`button-edit-${deal.TransID}`}
                              >
                                <Link href={`/edit-product/${deal.TransID}`}>
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Link>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAsSoldMutation.mutate(deal.TransID.toString())}
                                disabled={markAsSoldMutation.isPending || (deal.StockStatus || 1) === 2}
                                className="flex-1 text-xs disabled:opacity-50"
                                data-testid={`button-mark-sold-${deal.TransID}`}
                              >
                                <IndianRupee className="h-3 w-3 mr-1" />
                                Sold
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this product?')) {
                                    deleteDealMutation.mutate(deal.TransID.toString());
                                  }
                                }}
                                disabled={deleteDealMutation.isPending || (deal.StockStatus || 1) === 0}
                                className="text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                                data-testid={`button-delete-${deal.TransID}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inquiries Tab */}
          <TabsContent value="inquiries" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="text-foreground">Enquiry Management</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Track and manage buyer enquiries for your products
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {inquiriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : !sellerInquiries?.inquiries || sellerInquiries.inquiries.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No enquiries yet</h3>
                    <p className="text-muted-foreground">Buyer enquiries will appear here once customers start showing interest in your products</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted border-b-4 border-primary/20">
                        <TableHead className="font-semibold text-foreground">Buyer</TableHead>
                        <TableHead className="font-semibold text-foreground">Company</TableHead>
                        <TableHead className="font-semibold text-foreground">Quantity</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellerInquiries.inquiries.map((inquiry: any) => (
                        <TableRow
                          key={inquiry.id}
                          className="hover:bg-muted/50 transition-colors"
                          data-testid={`inquiry-row-${inquiry.id}`}
                        >
                          <TableCell className="py-4">
                            <div className="font-medium text-foreground">
                              {inquiry.buyer_name || 'Anonymous'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">
                              {inquiry.buyer_company || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">
                              {inquiry.quantity ? `${inquiry.quantity} ${inquiry.product_unit || 'units'}` : '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-base font-medium ${inquiry.status === 'responded' ? 'bg-green-100 text-green-700' :
                                  inquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                                    inquiry.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                }`}
                              data-testid={`inquiry-status-${inquiry.id}`}
                            >
                              {inquiry.status || 'open'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-foreground">
                              {inquiry.created_at ? new Date(inquiry.created_at).toLocaleDateString('en-IN') : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEnquiry(inquiry);
                                  setEnquiryModalOpen(true);
                                }}
                                data-testid={`button-view-${inquiry.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>

                              {inquiry.buyerEmail && (
                                <Button
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => {
                                    const subject = encodeURIComponent(`Regarding your enquiry`);
                                    const body = encodeURIComponent(`Dear ${inquiry.buyerName || 'Customer'},\n\nThank you for your enquiry.\n\nBest regards`);
                                    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${inquiry.buyerEmail}&su=${subject}&body=${body}`, '_blank');
                                  }}
                                  data-testid={`button-contact-${inquiry.id}`}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Contact
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Counter Offers Tab */}
          <TabsContent value="counter-offers" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                <CardTitle className="text-foreground">My Sent Enquiries</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Track enquiries you have sent to other sellers
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {buyerInquiriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : !buyerInquiries?.inquiries || buyerInquiries.inquiries.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No sent enquiries yet</h3>
                    <p className="text-muted-foreground">Enquiries you send to other sellers will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted border-b-4 border-primary/20">
                        <TableHead className="font-semibold text-foreground">Seller</TableHead>
                        <TableHead className="font-semibold text-foreground">Product</TableHead>
                        <TableHead className="font-semibold text-foreground">Quantity</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buyerInquiries.inquiries.map((inquiry: any) => (
                        <TableRow
                          key={inquiry.id}
                          className="hover:bg-muted/50 transition-colors"
                          data-testid={`sent-inquiry-row-${inquiry.id}`}
                        >
                          <TableCell className="py-4">
                            <div className="font-medium text-foreground">
                              {inquiry.seller_name || 'Unknown Seller'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">
                              <div className="font-medium">Product #{inquiry.product_id}</div>
                              <div className="text-sm text-muted-foreground">
                                {inquiry.product_details || ''}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-foreground">
                              {inquiry.quantity ? `${inquiry.quantity} ${inquiry.product_unit || 'units'}` : '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-base font-medium ${inquiry.status === 'responded' ? 'bg-green-100 text-green-700' :
                                  inquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                                    inquiry.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                }`}
                              data-testid={`sent-inquiry-status-${inquiry.id}`}
                            >
                              {inquiry.status || 'open'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-foreground">
                              {inquiry.created_at ? new Date(inquiry.created_at).toLocaleDateString('en-IN') : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEnquiry(inquiry);
                                  setEnquiryModalOpen(true);
                                }}
                                data-testid={`button-view-sent-${inquiry.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>

                              {inquiry.sellerEmail && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => {
                                    const subject = encodeURIComponent('Follow up on enquiry');
                                    const body = encodeURIComponent('Dear Seller,\n\nI would like to follow up on my enquiry.\n\nBest regards');
                                    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${inquiry.sellerEmail}&su=${subject}&body=${body}`, '_blank');
                                  }}
                                  data-testid={`button-followup-${inquiry.id}`}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  Follow Up
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rate Requests Tab */}
          <RateRequestsTab />
        </Tabs>

        {/* Order Details Modal */}
        <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Order Details
              </DialogTitle>
              <DialogDescription>
                Complete information about this enquiry/order
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Basic Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Order ID</p>
                    <p className="font-semibold">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge className={
                      selectedOrder.status === 'inquiry' ? 'bg-blue-100 text-blue-700' :
                        selectedOrder.status === 'sent' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                    }>
                      {selectedOrder.status === 'inquiry' ? 'Received Enquiry' :
                        selectedOrder.status === 'sent' ? 'Sent Enquiry' :
                          selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p>{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString('en-IN') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time</p>
                    <p>{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                  </div>
                </div>

                {/* Product Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Product Information</h3>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">{selectedOrder.product_title}</h4>

                    {/* Product Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Make:</span>
                        <span className="ml-2 font-medium">{selectedOrder.MakeName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Grade:</span>
                        <span className="ml-2 font-medium">{selectedOrder.GradeName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Brand:</span>
                        <span className="ml-2 font-medium">{selectedOrder.BrandName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">GSM:</span>
                        <span className="ml-2 font-medium">{selectedOrder.gsm || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span className="ml-2 font-medium">
                          {selectedOrder.deckle && selectedOrder.grain
                            ? `${selectedOrder.deckle}×${selectedOrder.grain}mm`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Name</p>
                      <p className="font-semibold">{selectedOrder.customer_name || 'Anonymous'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p>{selectedOrder.customer_company || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-blue-600">{selectedOrder.customer_email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p>{selectedOrder.customer_phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Enquiry Details */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Enquiry Details</h3>
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                        <p className="font-semibold">{selectedOrder.buyer_quantity || 'Not specified'}</p>
                      </div>
                    </div>

                    {selectedOrder.buyer_message && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
                        <div className="p-3 bg-slate-50 rounded border-l-4 border-blue-500">
                          <p className="text-sm">{selectedOrder.buyer_message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  {selectedOrder.customer_email && (
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        const subject = encodeURIComponent(`Regarding your enquiry for ${selectedOrder.product_title}`);
                        const body = encodeURIComponent(`Dear ${selectedOrder.customer_name},\n\nThank you for your enquiry about ${selectedOrder.product_title}.\n\nBest regards`);
                        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedOrder.customer_email}&su=${subject}&body=${body}`, '_blank');
                        setIsOrderModalOpen(false);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Reply via Gmail
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setIsOrderModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Product Details Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-2">
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            {selectedDeal && (
              <div className="space-y-2">
                {/* Product Information - Combined */}
                <div className="p-3 border rounded-lg space-y-2">
                  {/* Description */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Description</p>
                    <p className="text-sm font-semibold">{selectedDeal.stock_description || selectedDeal.Seller_comments || 'N/A'}</p>
                  </div>

                  {/* Product Attributes Grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={`text-xs ${getStatusColor(selectedDeal.StockStatus || 1)}`}>
                        {getStatusText(selectedDeal.StockStatus || 1)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="text-sm font-semibold">{selectedDeal.GroupName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Make</p>
                      <p className="text-sm font-semibold">{selectedDeal.MakeName || selectedDeal.Make || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Grade</p>
                      <p className="text-sm font-semibold">{selectedDeal.GradeName || selectedDeal.Grade || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Brand</p>
                      <p className="text-sm font-semibold">{selectedDeal.BrandName || selectedDeal.Brand || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Stock Age</p>
                      <p className="text-sm font-semibold">{selectedDeal.StockAge || 0} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-semibold">{getRelativeTime(selectedDeal.deal_created_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="p-3 border rounded-lg">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">GSM</p>
                      <p className="text-sm font-semibold">{selectedDeal.GSM || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deckle</p>
                      <p className="text-sm font-semibold">
                        {isKraftReelGroup(selectedDeal.GroupName, selectedDeal.GroupID) ? (
                          // For Kraft Reel: show only user's preferred unit
                          (userSettings as any)?.dimension_unit === 'inch' ? (
                            `${(selectedDeal.Deckle_mm / 25.4).toFixed(2)}"`
                          ) : (
                            `${(selectedDeal.Deckle_mm / 10).toFixed(1)}cm`
                          )
                        ) : (
                          // For regular products: show all conversions
                          <>
                            {selectedDeal.Deckle_mm}mm
                            {selectedDeal.Deckle_mm && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({(selectedDeal.Deckle_mm / 10).toFixed(1)}cm / {(selectedDeal.Deckle_mm / 25.4).toFixed(2)}in)
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isKraftReelGroup(selectedDeal.GroupName, selectedDeal.GroupID) ? 'B.S' : 'Grain'}
                      </p>
                      <p className="text-sm font-semibold">
                        {isKraftReelGroup(selectedDeal.GroupName, selectedDeal.GroupID) ? (
                          // For Kraft Reel B.S: show raw value without mm suffix
                          selectedDeal.grain_mm
                        ) : (
                          // For regular products: show with mm and conversions
                          <>
                            {selectedDeal.grain_mm}mm
                            {selectedDeal.grain_mm && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({(selectedDeal.grain_mm / 10).toFixed(1)}cm / {(selectedDeal.grain_mm / 25.4).toFixed(2)}in)
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <div className="p-3 border rounded-lg">
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="text-sm font-semibold">{selectedDeal.quantity || 'N/A'} {selectedDeal.OfferUnit || 'units'}</p>
                  </div>
                </div>

                {/* Packing Information */}
                {(selectedDeal.packing_type || selectedDeal.sheets_per_packet) && (
                  <div className="p-3 border rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedDeal.packing_type && (
                        <div>
                          <p className="text-xs text-muted-foreground">Packing Type</p>
                          <p className="text-sm font-semibold">{selectedDeal.packing_type}</p>
                        </div>
                      )}
                      {selectedDeal.sheets_per_packet && (
                        <div>
                          <p className="text-xs text-muted-foreground">Sheets Per Packet</p>
                          <p className="text-sm font-semibold">{selectedDeal.sheets_per_packet}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Seller Comments */}
                {selectedDeal.Seller_comments && (
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Additional Comments</p>
                    <p className="text-xs whitespace-pre-wrap">{selectedDeal.Seller_comments}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    asChild
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Link href={`/edit-product/${selectedDeal.TransID}`}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Product
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setViewModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Enquiry Details Modal */}
        <Dialog open={inquiryModalOpen} onOpenChange={setEnquiryModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-2">
              <DialogTitle>Enquiry Details</DialogTitle>
            </DialogHeader>

            {selectedEnquiry && (
              <div className="space-y-2">
                {/* Buyer Information */}
                <div className="p-3 border rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="text-sm font-semibold">{selectedEnquiry.buyer_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Company</p>
                      <p className="text-sm font-semibold">{selectedEnquiry.buyer_company || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-semibold text-blue-600">{selectedEnquiry.buyer_email || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-semibold">{selectedEnquiry.buyer_phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                <div className="p-3 border rounded-lg space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="text-sm font-semibold">{selectedEnquiry.product_title || selectedEnquiry.product_details || 'Product'}</p>
                  </div>
                  {selectedEnquiry.seller_name && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Seller</p>
                      <p className="text-sm font-semibold">{selectedEnquiry.seller_name} {selectedEnquiry.seller_company ? `(${selectedEnquiry.seller_company})` : ''}</p>
                    </div>
                  )}
                </div>

                {/* Enquiry Details */}
                <div className="p-3 border rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Your Offer Quantity</p>
                      <p className="text-sm font-semibold">
                        {selectedEnquiry.seller_offer_quantity
                          ? `${selectedEnquiry.seller_offer_quantity} ${selectedEnquiry.product_unit || 'units'}`
                          : 'Not available'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Buyer's Required Quantity</p>
                      <p className="text-sm font-semibold">
                        {selectedEnquiry.quantity
                          ? `${selectedEnquiry.quantity} ${selectedEnquiry.product_unit || 'units'}`
                          : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={`text-xs ${selectedEnquiry.status === 'responded' ? 'bg-green-100 text-green-700' :
                          selectedEnquiry.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                            selectedEnquiry.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                        }`}>
                        {selectedEnquiry.status || 'open'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-semibold">
                        {selectedEnquiry.created_at ?
                          new Date(selectedEnquiry.created_at).toLocaleDateString('en-IN') :
                          'Not available'}
                      </p>
                    </div>
                  </div>

                  {selectedEnquiry.message && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Message</p>
                      <p className="text-xs whitespace-pre-wrap">{selectedEnquiry.message}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  {selectedEnquiry.buyer_email && (
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        const subject = encodeURIComponent(`Re: Enquiry for ${selectedEnquiry.product_title || 'Product'}`);
                        const body = encodeURIComponent(`Dear ${selectedEnquiry.buyer_name || 'Customer'},\n\nThank you for your enquiry.\n\nBest regards`);
                        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedEnquiry.buyer_email}&su=${subject}&body=${body}`, '_blank');
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Reply via Gmail
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setEnquiryModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}