import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Package, MapPin, Calendar, User, Building, X } from "lucide-react";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
}

export default function ProductDetailsModal({ isOpen, onClose, deal }: ProductDetailsModalProps) {
  if (!deal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Product Details</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 rounded-lg flex items-center justify-center">
              <Package className="h-20 w-20 text-blue-400" />
            </div>
            
            {/* Status and Category */}
            <div className="flex gap-2">
              <Badge variant={deal.Status === 'active' ? 'default' : 'secondary'}>
                {deal.Status === 'active' ? 'Available' : deal.Status}
              </Badge>
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {deal.GroupName}
              </Badge>
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">{deal.DealTitle}</h3>
              {deal.Seller_comments && (
                <p className="text-muted-foreground">{deal.Seller_comments}</p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">
                ₹{deal.OfferPrice?.toLocaleString('en-IN')}
              </span>
              <span className="text-muted-foreground">per {deal.OfferUnit}</span>
            </div>

            {/* Product Specifications */}
            <div>
              <h4 className="font-semibold mb-3">Product Specifications</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {deal.MakeName && (
                  <div>
                    <span className="text-muted-foreground">Make:</span>
                    <span className="ml-2 font-medium">{deal.MakeName}</span>
                  </div>
                )}
                {deal.GradeName && (
                  <div>
                    <span className="text-muted-foreground">Grade:</span>
                    <span className="ml-2 font-medium">{deal.GradeName}</span>
                  </div>
                )}
                {deal.BrandName && (
                  <div>
                    <span className="text-muted-foreground">Brand:</span>
                    <span className="ml-2 font-medium">{deal.BrandName}</span>
                  </div>
                )}
                {deal.GSM && (
                  <div>
                    <span className="text-muted-foreground">GSM:</span>
                    <span className="ml-2 font-medium">{deal.GSM}</span>
                  </div>
                )}
                {deal.Deckle_mm && (
                  <div>
                    <span className="text-muted-foreground">Deckle:</span>
                    <span className="ml-2 font-medium">{deal.Deckle_mm}mm</span>
                  </div>
                )}
                {deal.grain_mm && (
                  <div>
                    <span className="text-muted-foreground">Grain:</span>
                    <span className="ml-2 font-medium">{deal.grain_mm}mm</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Seller Information */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Seller Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {deal.created_by_company || deal.seller_company || 'Company Name'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Contact Person:</span>
                  <span className="ml-2 font-medium">
                    {deal.created_by_name || deal.seller_name || 'Seller'}
                  </span>
                </div>
                {deal.Location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{deal.Location}</span>
                  </div>
                )}
                {deal.deal_created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Listed on {new Date(deal.deal_created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details */}
            {(deal.StockAge || deal.MinOrderQuantity) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-3">Additional Information</h4>
                  <div className="space-y-2 text-sm">
                    {deal.StockAge && (
                      <div>
                        <span className="text-muted-foreground">Stock Age:</span>
                        <span className="ml-2 font-medium">{deal.StockAge} days</span>
                      </div>
                    )}
                    {deal.MinOrderQuantity && (
                      <div>
                        <span className="text-muted-foreground">Minimum Order:</span>
                        <span className="ml-2 font-medium">{deal.MinOrderQuantity} {deal.OfferUnit}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}