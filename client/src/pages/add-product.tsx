import { useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, DollarSign, Hash, MapPin, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";

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

export default function AddDeal() {
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

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      const payload = {
        ...data,
        group_id: parseInt(data.group_id),
        make_id: parseInt(data.make_id),
        grade_id: parseInt(data.grade_id),
        brand_id: parseInt(data.brand_id),
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : undefined,
      };
      return apiRequest("POST", "/api/deals", payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal added successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setLocation("/seller-dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add deal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DealFormData) => {
    createDealMutation.mutate(data);
  };

  if (hierarchyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/seller-dashboard">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground mb-2">Add New Deal</h1>
            <p className="text-muted-foreground">
              Create a new stock deal by selecting from the stock hierarchy and set your terms.
            </p>
          </div>

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
                        Select the stock hierarchy for your deal
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
                                      <SelectItem key={make.make_ID} value={make.make_ID?.toString() || ""}>
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
                                  disabled={!selectedGroup}
                                  data-testid="select-grade"
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select grade" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredGrades.map((grade: any) => (
                                      <SelectItem key={grade.gradeID} value={grade.gradeID?.toString() || ""}>
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
                                      <SelectItem key={brand.brandID} value={brand.brandID?.toString() || ""}>
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Deal Information
                      </CardTitle>
                      <CardDescription>
                        Basic information about your deal
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
                                data-testid="input-title"
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
                                placeholder="Detailed description of your deal"
                                className="min-h-24"
                                {...field}
                                data-testid="input-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </CardContent>
                  </Card>

                  {/* Pricing & Inventory */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Pricing & Inventory
                      </CardTitle>
                      <CardDescription>
                        Set your product pricing and inventory details
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price (₹) *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  data-testid="input-price"
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger data-testid="select-unit">
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="piece">Piece</SelectItem>
                                    <SelectItem value="kg">Kilogram</SelectItem>
                                    <SelectItem value="liter">Liter</SelectItem>
                                    <SelectItem value="box">Box</SelectItem>
                                    <SelectItem value="pack">Pack</SelectItem>
                                    <SelectItem value="roll">Roll</SelectItem>
                                    <SelectItem value="sheet">Sheet</SelectItem>
                                    <SelectItem value="meter">Meter</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Available Quantity *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
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
                          name="min_order_quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Order Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  data-testid="input-min-quantity"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Information */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Additional Information
                      </CardTitle>
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
                                placeholder="City, State" 
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
                        name="expiry_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                data-testid="input-expiry"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={createDealMutation.isPending}
                          data-testid="button-submit"
                        >
                          {createDealMutation.isPending ? "Adding Deal..." : "Add Deal"}
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setLocation("/seller-dashboard")}
                          data-testid="button-cancel"
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}