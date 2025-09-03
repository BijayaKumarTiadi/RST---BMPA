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
  const [quotedPrice, setQuotedPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");

  const handleSendWhatsApp = () => {
    if (!deal) return;
    
    const buyerName = user?.name || user?.company_name || 'Buyer';
    const productTitle = deal.DealTitle || deal.Seller_comments || `${deal.MakeName} ${deal.GradeName} ${deal.BrandName}`.trim() || 'Product';
    const productDetails = `${productTitle} (ID: ${deal.TransID})`;
    const sellerPrice = `₹${(deal.OfferPrice || deal.Price || 0).toLocaleString('en-IN')} per ${deal.OfferUnit || deal.Unit || 'unit'}`;
    
    const additionalDetails = [];
    if (deal.MakeName) additionalDetails.push(`Make: ${deal.MakeName}`);
    if (deal.GradeName) additionalDetails.push(`Grade: ${deal.GradeName}`);
    if (deal.BrandName) additionalDetails.push(`Brand: ${deal.BrandName}`);
    if (deal.GSM) additionalDetails.push(`GSM: ${deal.GSM}`);
    
    const productInfo = additionalDetails.length > 0 
      ? `${productDetails} (${additionalDetails.join(', ')})` 
      : productDetails;

    let whatsappMessage = `Hey, I am ${buyerName}. I am interested in ${productInfo}, your price is ${sellerPrice}`;
    
    if (quotedPrice) {
      whatsappMessage += `, my quotation price is ₹${quotedPrice}`;
    }
    
    if (quantity) {
      whatsappMessage += `, required quantity: ${quantity}`;
    }
    
    if (message) {
      whatsappMessage += `.\n\nAdditional message: ${message}`;
    }
    
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/918984222915?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    // Reset form and close modal
    setQuotedPrice("");
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
              Seller's Price: ₹{(deal.OfferPrice || deal.Price || 0).toLocaleString('en-IN')} per {deal.OfferUnit || deal.Unit || 'unit'}
            </p>
          </div>

          {/* Quotation Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quoted-price">Your Quoted Price (₹)</Label>
              <Input
                id="quoted-price"
                type="number"
                placeholder="Enter your price"
                value={quotedPrice}
                onChange={(e) => setQuotedPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Required Quantity</Label>
              <Input
                id="quantity"
                placeholder="e.g., 100 reams, 50 tonnes"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
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