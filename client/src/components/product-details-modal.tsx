import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, MapPin, Calendar, User, Building, Mail, MessageSquare, Phone } from "lucide-react";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
  onSendInquiry?: (deal: any) => void;
  onSendWhatsApp?: (deal: any) => void;
}

export default function ProductDetailsModal({ isOpen, onClose, deal, onSendInquiry, onSendWhatsApp }: ProductDetailsModalProps) {
  if (!deal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {deal.stock_description || `${deal.Make} ${deal.Brand} ${deal.Grade}`.trim() || 'Product Details'}
          </DialogTitle>
        </DialogHeader>

        {/* Product Description - Large text below title */}
        {deal.stock_description && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
            <p className="text-xl text-foreground leading-relaxed font-medium">
              {deal.stock_description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Status and Category */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border shadow-sm">
              <h4 className="font-semibold mb-4 text-lg">Product Status</h4>
              <div className="space-y-3">
                <Badge variant={deal.Status === 'active' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                  {deal.Status === 'active' ? 'Available' : deal.Status}
                </Badge>
                <Badge variant="secondary" className="bg-blue-600 text-white text-sm px-3 py-1">
                  {deal.GroupName}
                </Badge>
              </div>
            </div>
          </div>

          {/* Center Column - Price and Quantity */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border shadow-sm">
              <h4 className="font-semibold mb-4 text-lg">Pricing & Quantity</h4>
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary block">
                    ₹{deal.OfferPrice?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-muted-foreground text-lg">per {deal.OfferUnit}</span>
                </div>
                <div className="text-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Available Quantity</span>
                  <div className="text-2xl font-semibold text-foreground">
                    {deal.quantity || '1000'} {deal.OfferUnit || 'KG'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Product Specifications */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border shadow-sm">
              <h4 className="font-semibold mb-4 text-lg">Product Specifications</h4>
              <div className="space-y-3">
                {deal.Make && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Make:</span>
                    <span className="font-medium">{deal.Make}</span>
                  </div>
                )}
                {deal.Grade && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grade:</span>
                    <span className="font-medium">{deal.Grade}</span>
                  </div>
                )}
                {deal.Brand && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brand:</span>
                    <span className="font-medium">{deal.Brand}</span>
                  </div>
                )}
                {deal.GSM && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GSM:</span>
                    <span className="font-medium">{deal.GSM}</span>
                  </div>
                )}
                {deal.Deckle_mm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deckle:</span>
                    <span className="font-medium">{deal.Deckle_mm}mm</span>
                  </div>
                )}
                {deal.grain_mm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grain:</span>
                    <span className="font-medium">{deal.grain_mm}mm</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Section - Seller Information and Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border shadow-sm">
            <h4 className="font-semibold mb-4 text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Seller Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {deal.created_by_company || deal.seller_company || 'Company Name'}
                </span>
              </div>
              
              {deal.created_by_name && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">Contact Person:</span>
                  <span className="font-medium text-sm">{deal.created_by_name}</span>
                </div>
              )}
              
              {deal.created_by_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-blue-600">{deal.created_by_email}</span>
                </div>
              )}
              
              {deal.created_by_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{deal.created_by_phone}</span>
                </div>
              )}
              
              {deal.uplaodDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Listed on {new Date(deal.uplaodDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Seller Notes */}
            {deal.Seller_comments && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-orange-600" />
                  <span className="font-semibold text-orange-600">Seller Notes</span>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-foreground italic whitespace-pre-wrap">
                    {deal.Seller_comments}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border shadow-sm">
            <h4 className="font-semibold mb-4 text-lg">Contact Seller</h4>
            <div className="space-y-3">
              {onSendInquiry && (
                <Button 
                  onClick={() => onSendInquiry(deal)} 
                  className="w-full"
                  size="lg"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Send Inquiry
                </Button>
              )}
              {onSendWhatsApp && (
                <Button 
                  onClick={() => onSendWhatsApp(deal)} 
                  variant="secondary" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  WhatsApp
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}