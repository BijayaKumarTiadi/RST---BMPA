import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, Building, Mail, MessageSquare, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatPostingDate } from "@/lib/utils";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
  onSendInquiry?: (deal: any) => void;
  onSendWhatsApp?: (deal: any) => void;
}

export default function ProductDetailsModal({ isOpen, onClose, deal, onSendInquiry, onSendWhatsApp }: ProductDetailsModalProps) {
  // Fetch user settings to get dimension preference
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: isOpen // Only fetch when modal is open
  });

  if (!deal) return null;

  // Helper function to check if group is Kraft Reel
  const isKraftReelGroup = (groupName: string): boolean => {
    return groupName?.toLowerCase().trim() === 'kraft reel';
  };

  // Helper function to format dimensions based on user preference
  const formatDimensions = (deckle_mm?: number, grain_mm?: number) => {
    if (!deckle_mm || !grain_mm) return null;
    
    const userUnit = (userSettings as any)?.dimension_unit || 'cm';
    const isKraftReel = isKraftReelGroup(deal.GroupName || '');
    
    if (isKraftReel) {
      // For Kraft Reel: use "x" separator and show original grain_mm value with "B.S" suffix
      if (userUnit === 'inch') {
        const deckleInch = (deckle_mm / 25.4).toFixed(2);
        return `${deckleInch}" x ${grain_mm} B.S`;
      } else {
        const deckleCm = (deckle_mm / 10).toFixed(1);
        return `${deckleCm} x ${grain_mm} B.S`;
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {deal.stock_description || `${deal.Make} ${deal.Brand} ${deal.Grade}`.trim() || 'Product Details'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pb-4">
          {/* Status and Category */}
          <div className="flex gap-2 justify-center">
            <Badge variant="secondary" className="bg-blue-600 text-white">
              {deal.GroupName}
            </Badge>
          </div>

          {/* Price */}
          <div className="text-center">
            <span className="text-2xl font-bold text-primary">
              ₹{deal.OfferPrice?.toLocaleString('en-IN')}
            </span>
            <span className="text-lg text-muted-foreground ml-2">per {deal.OfferUnit}</span>
          </div>

          {/* Product Specifications */}
          <div>
            <h4 className="font-semibold mb-3 text-center">Product Specifications</h4>
            <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              {deal.Make && (
                <div>
                  <span className="text-muted-foreground">Make:</span>
                  <span className="ml-2 font-medium">{deal.Make}</span>
                </div>
              )}
              {deal.Grade && (
                <div>
                  <span className="text-muted-foreground">Grade:</span>
                  <span className="ml-2 font-medium">{deal.Grade}</span>
                </div>
              )}
              {deal.Brand && (
                <div>
                  <span className="text-muted-foreground">Brand:</span>
                  <span className="ml-2 font-medium">{deal.Brand}</span>
                </div>
              )}
              {deal.GSM && (
                <div>
                  <span className="text-muted-foreground">GSM:</span>
                  <span className="ml-2 font-medium">{deal.GSM}</span>
                </div>
              )}
              {deal.Deckle_mm && deal.grain_mm && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Dim (Deckle × Grain):</span>
                  <span className="ml-2 font-medium">{formatDimensions(deal.Deckle_mm, deal.grain_mm)}</span>
                </div>
              )}
              {deal.quantity && (
                <div>
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="ml-2 font-medium">{deal.quantity} {deal.Unit}</span>
                </div>
              )}
              {deal.GroupName && (
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <span className="ml-2 font-medium">{deal.GroupName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Seller Information */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center justify-center gap-2">
              <User className="h-4 w-4" />
              Seller Information
            </h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {deal.seller_company || deal.created_by_company || deal.seller_name || deal.created_by_name || 'Company Name'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Contact Person:</span>
                  <span className="font-medium">
                    {deal.created_by_name || deal.seller_name || 'Contact Person'}
                  </span>
                </div>
                {deal.seller_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${deal.seller_email}`} className="text-blue-600 hover:underline">
                      {deal.seller_email}
                    </a>
                  </div>
                )}
                {deal.seller_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${deal.seller_phone}`} className="text-blue-600 hover:underline">
                      {deal.seller_phone}
                    </a>
                  </div>
                )}
                <div className="text-muted-foreground text-xs">
                  Posted on {formatPostingDate(deal)}
                </div>
              </div>
            </div>
          </div>

          {/* Seller Notes */}
          {deal.Seller_comments && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Seller Notes
              </h4>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-foreground italic">
                  {deal.Seller_comments}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            {onSendInquiry && (
              <Button 
                onClick={() => onSendInquiry(deal)}
                className="flex-1"
                size="lg"
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Inquiry
              </Button>
            )}
            {onSendWhatsApp && (
              <Button 
                onClick={() => onSendWhatsApp(deal)}
                variant="secondary"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}