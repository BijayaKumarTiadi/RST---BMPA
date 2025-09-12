import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Mail, X, Send } from "lucide-react";

interface InquiryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
}

export default function InquiryFormModal({ isOpen, onClose, deal }: InquiryFormModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    buyerName: user?.name || "",
    buyerCompany: user?.company || "",
    buyerEmail: user?.email || "",
    buyerPhone: user?.phone || "",
    quotedPrice: "",
    quantity: "",
    message: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const emailData = {
        to: deal.seller_email || `seller${deal.memberID}@stocklaabh.com`, // Default email format
        subject: `Inquiry for Product: ${deal.DealTitle} (ID: ${deal.TransID})`,
        buyerName: formData.buyerName,
        buyerCompany: formData.buyerCompany,
        buyerEmail: formData.buyerEmail,
        buyerPhone: formData.buyerPhone,
        productId: deal.TransID,
        productTitle: deal.DealTitle,
        productDetails: {
          make: deal.MakeName,
          grade: deal.GradeName,
          brand: deal.BrandName,
          gsm: deal.GSM,
          deckle: deal.Deckle_mm,
          grain: deal.grain_mm,
          sellerPrice: deal.OfferPrice,
          unit: deal.OfferUnit
        },
        buyerQuotedPrice: formData.quotedPrice,
        quantity: formData.quantity,
        message: formData.message,
        sellerName: deal.created_by_name || deal.seller_name,
        sellerCompany: deal.created_by_company || deal.seller_company
      };

      const response = await fetch('/api/inquiries/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(emailData)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Inquiry Sent Successfully!",
          description: "Your inquiry has been sent to the seller. They will contact you soon.",
        });
        onClose();
        // Reset form
        setFormData({
          buyerName: user?.name || "",
          buyerCompany: user?.company || "",
          buyerEmail: user?.email || "",
          buyerPhone: user?.phone || "",
          quotedPrice: "",
          quantity: "",
          message: ""
        });
      } else {
        throw new Error(result.message || 'Failed to send inquiry');
      }
    } catch (error) {
      console.error('Error sending inquiry:', error);
      toast({
        title: "Error",
        description: "Failed to send inquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!deal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Inquiry
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {/* Product Summary */}
          <div className="bg-muted p-4 rounded-lg mb-6">
            <h4 className="font-semibold mb-2">Product: {deal.DealTitle}</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Product ID: {deal.TransID}</div>
              <div>Seller Price: ₹{deal.OfferPrice?.toLocaleString('en-IN')} per {deal.OfferUnit}</div>
              <div>Seller: {deal.created_by_name || deal.seller_name} ({deal.created_by_company || deal.seller_company})</div>
            </div>
          </div>

          {/* Inquiry Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buyerName">Your Name *</Label>
                <Input
                  id="buyerName"
                  name="buyerName"
                  value={formData.buyerName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="buyerCompany">Company Name</Label>
                <Input
                  id="buyerCompany"
                  name="buyerCompany"
                  value={formData.buyerCompany}
                  onChange={handleInputChange}
                  placeholder="Enter your company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buyerEmail">Email Address *</Label>
                <Input
                  id="buyerEmail"
                  name="buyerEmail"
                  type="email"
                  value={formData.buyerEmail}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <Label htmlFor="buyerPhone">Phone Number</Label>
                <Input
                  id="buyerPhone"
                  name="buyerPhone"
                  type="tel"
                  value={formData.buyerPhone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quotedPrice">Your Quoted Price (₹)</Label>
                <Input
                  id="quotedPrice"
                  name="quotedPrice"
                  type="number"
                  value={formData.quotedPrice}
                  onChange={handleInputChange}
                  placeholder="Enter your price offer"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity Required</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder={`Quantity in ${deal.OfferUnit}`}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="message">Additional Message</Label>
              <Textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Any additional requirements or questions..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Inquiry
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}