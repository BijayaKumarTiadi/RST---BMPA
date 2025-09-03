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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, DollarSign, Hash, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";

const dealSchema = z.object({
  groupID: z.string().min(1, "Stock group is required"),
  MakeID: z.string().min(1, "Stock make is required"),
  GradeID: z.string().min(1, "Stock grade is required"),
  BrandID: z.string().min(1, "Stock brand is required"),
  GSM: z.number().min(1, "GSM is required"),
  Deckle_mm: z.number().min(1, "Deckle (mm) is required"),
  grain_mm: z.number().min(1, "Grain (mm) is required"),
  OfferPrice: z.number().min(0.01, "Offer price must be greater than 0"),
  OfferUnit: z.string().min(1, "Unit is required"),
  Seller_comments: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

export default function AddDeal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      groupID: "",
      MakeID: "",
      GradeID: "",
      BrandID: "",
      GSM: 0,
      Deckle_mm: 0,
      grain_mm: 0,
      OfferPrice: 0,
      OfferUnit: "",
      Seller_comments: "",
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
    selectedGroup ? (make.GroupID != null ? make.GroupID.toString() === selectedGroup : false) : true
  );
  const filteredGrades = grades.filter((grade: any) => 
    selectedMake ? (grade.Make_ID != null ? grade.Make_ID.toString() === selectedMake : false) : true
  );
  const filteredBrands = brands.filter((brand: any) => 
    selectedMake ? (brand.make_ID != null ? brand.make_ID.toString() === selectedMake : false) : true
  );

  // Handle selection changes to reset dependent fields
  const handleGroupChange = (value: string) => {
    setSelectedGroup(value);
    setSelectedMake("");
    form.setValue("groupID", value);
    form.setValue("MakeID", "");
    form.setValue("GradeID", "");
    form.setValue("BrandID", "");
  };

  const handleMakeChange = (value: string) => {
    setSelectedMake(value);
    form.setValue("MakeID", value);
    form.setValue("BrandID", "");
  };

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      const payload = {
        ...data,
        groupID: data.groupID ? parseInt(data.groupID) : 0,
        MakeID: data.MakeID ? parseInt(data.MakeID) : 0,
        GradeID: data.GradeID ? parseInt(data.GradeID) : 0,
        BrandID: data.BrandID ? parseInt(data.BrandID) : 0,
      };
      return apiRequest("POST", "/api/deals", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/stats"] });
      
      if (saveAndAddAnother) {
        toast({
          title: "Success",
          description: "Deal added successfully! Add another deal below.",
        });
        // Reset form for next entry, but keep the selected group and make for convenience
        form.reset({
          groupID: selectedGroup,
          MakeID: selectedMake,
          GradeID: "",
          BrandID: "",
          GSM: 0,
          Deckle_mm: 0,
          grain_mm: 0,
          OfferPrice: 0,
          OfferUnit: "",
          Seller_comments: "",
        });
        setSaveAndAddAnother(false);
      } else {
        toast({
          title: "Success",
          description: "Deal added successfully!",
        });
        setLocation("/seller-dashboard");
      }
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

  const onSubmitAndAddAnother = (data: DealFormData) => {
    setSaveAndAddAnother(true);
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Add New Stock Deal</h1>
            <p className="text-muted-foreground">
              Add your stock inventory to the marketplace. Fill in the details below to create a new deal that buyers can discover.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Stock Selection */}
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
                      name="groupID"
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
                                  group.GroupID != null ? (
                                    <SelectItem key={group.GroupID} value={group.GroupID.toString()}>
                                      {group.GroupName || `Group ${group.GroupID}`}
                                    </SelectItem>
                                  ) : null
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
                      name="MakeID"
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
                                  make.make_ID != null ? (
                                    <SelectItem key={make.make_ID} value={make.make_ID.toString()}>
                                      {make.make_Name || `Make ${make.make_ID}`}
                                    </SelectItem>
                                  ) : null
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
                      name="GradeID"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade *</FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              disabled={!selectedMake}
                              data-testid="select-grade"
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredGrades.map((grade: any) => (
                                  grade.gradeID != null ? (
                                    <SelectItem key={grade.gradeID} value={grade.gradeID.toString()}>
                                      {grade.GradeName || `Grade ${grade.gradeID}`}
                                    </SelectItem>
                                  ) : null
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
                      name="BrandID"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand *</FormLabel>
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
                                  brand.brandID != null ? (
                                    <SelectItem key={brand.brandID} value={brand.brandID.toString()}>
                                      {brand.brandname || `Brand ${brand.brandID}`}
                                    </SelectItem>
                                  ) : null
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

              {/* Technical Specifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Technical Specifications
                  </CardTitle>
                  <CardDescription>
                    Enter the technical details for your stock
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="GSM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GSM *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 80" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-gsm" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="Deckle_mm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deckle (mm) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 650" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-deckle" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grain_mm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grain (mm) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 900" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-grain" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing & Comments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing & Details
                  </CardTitle>
                  <CardDescription>
                    Set your offer price and add any seller comments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="OfferPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Offer Price *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="e.g., 45.50" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-price" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="OfferUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} data-testid="select-unit">
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="ton">Ton</SelectItem>
                                <SelectItem value="ream">Ream</SelectItem>
                                <SelectItem value="sheet">Sheet</SelectItem>
                                <SelectItem value="bundle">Bundle</SelectItem>
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
                    name="Seller_comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seller Comments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any additional details about the stock..."
                            {...field}
                            data-testid="input-comments"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Save Options</CardTitle>
                  <CardDescription>
                    Choose how you want to proceed after saving this deal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      type="submit"
                      className="h-12"
                      disabled={createDealMutation.isPending}
                      data-testid="button-submit"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      {createDealMutation.isPending ? "Saving..." : "Save & Go to Dashboard"}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-12"
                      disabled={createDealMutation.isPending}
                      onClick={() => form.handleSubmit(onSubmitAndAddAnother)()}
                      data-testid="button-submit-add-another"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {createDealMutation.isPending ? "Saving..." : "Save & Add Another"}
                    </Button>
                  </div>
                  
                  <div className="mt-4">
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
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}