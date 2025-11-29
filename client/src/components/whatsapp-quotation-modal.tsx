import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";

interface WhatsAppQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
  user: any;
}

export default function WhatsAppQuotationModal({ isOpen, onClose, deal, user }: WhatsAppQuotationModalProps) {
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");

  // Helper function to format dimensions
  const formatSize = (deckle_mm: number, grain_mm: number, groupName?: string) => {
    if (!deckle_mm) return null;
    
    // Check if it's a reel product (only deckle, no grain)
    const isReel = groupName?.toLowerCase().includes('reel');
    
    if (isReel && !grain_mm) {
      // For reels, show just deckle in cm
      return `${(deckle_mm / 10).toFixed(1)} cm`;
    }
    
    // For sheets/boards, show deckle x grain in cm
    if (deckle_mm && grain_mm) {
      return `${(deckle_mm / 10).toFixed(1)} x ${(grain_mm / 10).toFixed(1)} cm`;
    }
    
    return null;
  };

  const handleSendWhatsApp = () => {
    if (!deal) return;
    
    const buyerName = user?.name || user?.company_name || 'Buyer';
    const productTitle = deal.DealTitle || deal.Seller_comments || `${deal.MakeName} ${deal.GradeName} ${deal.BrandName}`.trim() || 'Product';
    const productDetails = `${productTitle} (ID: ${deal.TransID})`;
    
    // Check if it's Paper/Board group (GroupID 1 or 2, or name contains Paper/Board)
    const isPaperBoardGroup = deal.GroupID === 1 || deal.GroupID === 2 || 
      deal.GroupName?.toLowerCase().includes('paper') || 
      deal.GroupName?.toLowerCase().includes('board');
    
    const additionalDetails = [];
    
    if (isPaperBoardGroup) {
      // For Paper/Board: Mill, Type of Board, Brand, GSM, Size
      if (deal.MakeName) additionalDetails.push(`Mill: ${deal.MakeName}`);
      if (deal.GradeName) additionalDetails.push(`Type: ${deal.GradeName}`);
      if (deal.category_name) additionalDetails.push(`Category: ${deal.category_name}`);
      if (deal.BrandName) additionalDetails.push(`Brand: ${deal.BrandName}`);
      if (deal.GSM) additionalDetails.push(`GSM: ${deal.GSM}`);
      
      // Add size (Deckle x Grain)
      const size = formatSize(deal.Deckle_mm, deal.grain_mm, deal.GroupName);
      if (size) additionalDetails.push(`Size: ${size}`);
    } else {
      // For other groups - original behavior
      if (deal.MakeName) additionalDetails.push(`Make: ${deal.MakeName}`);
      if (deal.GradeName) additionalDetails.push(`Grade: ${deal.GradeName}`);
      if (deal.BrandName) additionalDetails.push(`Brand: ${deal.BrandName}`);
      if (deal.GSM) additionalDetails.push(`GSM: ${deal.GSM}`);
      
      // Add size for other product types as well
      const size = formatSize(deal.Deckle_mm, deal.grain_mm, deal.GroupName);
      if (size) additionalDetails.push(`Size: ${size}`);
    }
    
    const productInfo = additionalDetails.length > 0 
      ? `${productDetails}\n${additionalDetails.join(', ')}` 
      : productDetails;

    let whatsappMessage = `Hey, I am ${buyerName}. I am interested in ${productInfo}`;
    
    if (quantity) {
      whatsappMessage += `, required quantity: ${quantity}`;
    }
    
    if (message) {
      whatsappMessage += `.\n\nAdditional message: ${message}`;
    }
    
    const encodedMessage = encodeURIComponent(whatsappMessage);
    // Use seller's phone number or fallback to default
    const sellerPhone = deal.seller_phone || deal.phone || '918984222915';
    const cleanPhone = sellerPhone.replace(/[^0-9]/g, ''); // Remove non-numeric characters
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    // Reset form and close modal
    setQuantity("");
    setMessage("");
    onClose();
  };

  if (!deal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Quotation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Product Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">{deal.DealTitle || 'Product'}</h4>
            <p className="text-sm text-muted-foreground">
              Available Quantity: {deal.quantity || 0} {deal.OfferUnit || deal.Unit || 'unit'}
            </p>
          </div>

          {/* Quotation Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Required Quantity</Label>
              <Input
                id="quantity"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 100 reams, 50 tonnes"
                value={quantity}
                maxLength={8}
                onBeforeInput={(e: any) => {
                  const char = e.data;
                  if (char && !/^[0-9.]$/.test(char)) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setQuantity(value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Additional Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Any additional requirements or questions..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={400}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSendWhatsApp}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}