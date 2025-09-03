import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, DollarSign, Hash, MapPin, Save } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import Navigation from "@/components/navigation";

const dealSchema = z.object({
  deal_title: z.string().min(1, "Deal title is required").max(200, "Title must be under 200 characters"),
  deal_description: z.string().optional(),
  group_id: z.string().min(1, "Stock group is required"),
  make_id: z.string().min(1, "Stock make is required"),
  grade_id: z.string().min(1, "Stock grade is required"),
  brand_id: z.string().min(1, "Stock brand is required"),
  price: z.number().min(0.01, "Price must be greater than 0"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  min_order_quantity: z.number().int().min(1, "Minimum order quantity must be at least 1").optional(),
  location: z.string().optional(),
  expires_at: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

export default function EditDeal() {
  const params = useParams();
  const dealId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      deal_title: "",
      deal_description: "",
      group_id: "",
      make_id: "",
      grade_id: "",
      brand_id: "",
      price: 0,
      quantity: 1,
      unit: "",
      min_order_quantity: 1,
      location: "",
      expires_at: "",
    },
  });

  // Fetch deal data for editing
  const { data: dealData, isLoading: dealLoading } = useQuery({
    queryKey: ["/api/deals", dealId],
    queryFn: async () => {
      const response = await fetch(`/api/deals/${dealId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch deal');
      return response.json();
    },
    enabled: !!dealId,
  });

  // Fetch stock hierarchy
  const { data: stockHierarchy, isLoading: hierarchyLoading } = useQuery({
    queryKey: ["/api/stock/hierarchy"],
    queryFn: async () => {
      const response = await fetch('/api/stock/hierarchy');
      if (!response.ok) throw new Error('Failed to fetch stock hierarchy');
      return response.json();
    },
  });

  const groups = stockHierarchy?.groups || [];
  const makes = stockHierarchy?.makes || [];
  const grades = stockHierarchy?.grades || [];
  const brands = stockHierarchy?.brands || [];

  // Filter makes, grades, and brands based on selections
  const filteredMakes = makes.filter((make: any) => 
    selectedGroup ? make.GroupID?.toString() === selectedGroup : true
  );
  const filteredGrades = grades.filter((grade: any) => 
    selectedMake ? grade.Make_ID?.toString() === selectedMake : true
  );
  const filteredBrands = brands.filter((brand: any) => 
    selectedMake ? brand.make_ID?.toString() === selectedMake : true
  );

  // Populate form when deal data is loaded
  useEffect(() => {
    if (dealData?.deal) {
      const deal = dealData.deal;
      
      // Set form values
      form.setValue("deal_title", deal.Seller_comments?.split('\n')[0] || '');
      form.setValue("deal_description", deal.Seller_comments?.split('\n').slice(1).join('\n') || '');
      form.setValue("group_id", deal.groupID?.toString() || '');
      form.setValue("make_id", deal.MakeID?.toString() || '');
      form.setValue("grade_id", deal.GradeID?.toString() || '');
      form.setValue("brand_id", deal.BrandID?.toString() || '');
      form.setValue("price", deal.OfferPrice || 0);
      form.setValue("quantity", deal.QtyMT || 1);
      form.setValue("unit", deal.OfferUnit || '');
      form.setValue("location", deal.Location || '');
      
      // Set state for dropdowns
      setSelectedGroup(deal.groupID?.toString() || '');
      setSelectedMake(deal.MakeID?.toString() || '');
      setSelectedGrade(deal.GradeID?.toString() || '');
    }
  }, [dealData, form]);

  // Handle selection changes to reset dependent fields
  const handleGroupChange = (value: string) => {
    setSelectedGroup(value);
    setSelectedMake("");
    setSelectedGrade("");
    form.setValue("group_id", value);
    form.setValue("make_id", "");
    form.setValue("grade_id", "");
    form.setValue("brand_id", "");
  };

  const handleMakeChange = (value: string) => {
    setSelectedMake(value);
    form.setValue("make_id", value);
    form.setValue("brand_id", "");
  };

  const handleGradeChange = (value: string) => {
    setSelectedGrade(value);
    form.setValue("grade_id", value);
  };

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      const payload = {
        ...data,
        group_id: parseInt(data.group_id),
        make_id: parseInt(data.make_id),
        grade_id: parseInt(data.grade_id),
        brand_id: parseInt(data.brand_id),
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : undefined,
      };
      return apiRequest("PUT", `/api/deals/${dealId}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/deals"] });
      setLocation("/seller-dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update deal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DealFormData) => {
    updateDealMutation.mutate(data);
  };

  if (dealLoading || hierarchyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!dealData?.deal) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Deal Not Found</h1>
            <p className="text-muted-foreground mb-4">The deal you're looking for doesn't exist or you don't have permission to edit it.</p>
            <Button asChild>
              <Link href="/seller-dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" asChild data-testid="button-back">
              <Link href="/seller-dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Deal</h1>
          <p className="text-muted-foreground">Update your deal information and pricing</p>
        </div>

        {/* Edit Form */}
        <div className="space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stock Selection */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Stock Selection
                      </CardTitle>
                      <CardDescription>
                        Update the stock hierarchy for your deal
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="group_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock Group *</FormLabel>
                              <FormControl>
                                <Select 
                                  value={field.value} 
                                  onValueChange={handleGroupChange}
                                  data-testid="select-group"
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select group" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {groups.map((group: any) => (
                                      <SelectItem key={group.GroupID} value={group.GroupID.toString()}>
                                        {group.GroupName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="make_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock Make *</FormLabel>
                              <FormControl>
                                <Select 
                                  value={field.value} 
                                  onValueChange={handleMakeChange}
                                  disabled={!selectedGroup}
                                  data-testid="select-make"
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select make" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredMakes.map((make: any) => (
                                      <SelectItem key={make.make_ID} value={make.make_ID.toString()}>
                                        {make.make_Name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="grade_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock Grade *</FormLabel>
                              <FormControl>
                                <Select 
                                  value={field.value} 
                                  onValueChange={handleGradeChange}
                                  disabled={!selectedMake}
                                  data-testid="select-grade"
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select grade" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredGrades.map((grade: any) => (
                                      <SelectItem key={grade.gradeID} value={grade.gradeID.toString()}>
                                        {grade.GradeName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="brand_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock Brand *</FormLabel>
                              <FormControl>
                                <Select 
                                  value={field.value} 
                                  onValueChange={field.onChange}
                                  disabled={!selectedMake}
                                  data-testid="select-brand"
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select brand" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredBrands.map((brand: any) => (
                                      <SelectItem key={brand.brandID} value={brand.brandID.toString()}>
                                        {brand.brandname}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Deal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Deal Information
                      </CardTitle>
                      <CardDescription>
                        Update the details of your deal
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="deal_title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deal Title *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter deal title" 
                                {...field} 
                                data-testid="input-deal-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deal_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deal Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your deal (optional)" 
                                className="min-h-[100px]"
                                {...field} 
                                data-testid="textarea-deal-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Pricing & Inventory */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Pricing & Inventory
                      </CardTitle>
                      <CardDescription>
                        Update pricing and quantity information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price per Unit (₹) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0.00" 
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-price"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="1" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-quantity"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="unit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit *</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange} data-testid="select-unit">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                    <SelectItem value="MT">Metric Tons (MT)</SelectItem>
                                    <SelectItem value="tons">Tons</SelectItem>
                                    <SelectItem value="pieces">Pieces</SelectItem>
                                    <SelectItem value="sheets">Sheets</SelectItem>
                                    <SelectItem value="reams">Reams</SelectItem>
                                    <SelectItem value="rolls">Rolls</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="min_order_quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Order Quantity</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="1" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-min-order"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Location & Expiry
                      </CardTitle>
                      <CardDescription>
                        Optional location and expiry information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Mumbai, Maharashtra" 
                                {...field} 
                                data-testid="input-location"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="expires_at"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expires At</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                data-testid="input-expires-at"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={updateDealMutation.isPending}
                    data-testid="button-update-deal"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateDealMutation.isPending ? "Updating..." : "Update Deal"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}