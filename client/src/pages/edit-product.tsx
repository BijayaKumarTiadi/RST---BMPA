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
import { ArrowLeft, Package, IndianRupee, Hash, Save } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import Navigation from "@/components/navigation";

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

export default function EditDeal() {
  const params = useParams();
  const dealId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedMake, setSelectedMake] = useState("");

  // Unit conversion state
  const [deckleUnit, setDeckleUnit] = useState("mm");
  const [grainUnit, setGrainUnit] = useState("mm");
  const [deckleInputValue, setDeckleInputValue] = useState("");
  const [grainInputValue, setGrainInputValue] = useState("");

  // Unit conversion functions
  const convertToMm = (value: number, unit: string): number => {
    switch (unit) {
      case "cm":
        return value * 10;
      case "inch":
        return value * 25.4;
      case "mm":
      default:
        return value;
    }
  };

  // Handle unit conversion and form updates
  const handleDeckleChange = (value: string, unit: string) => {
    setDeckleInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const mmValue = convertToMm(numValue, unit);
      form.setValue("Deckle_mm", mmValue);
    }
  };

  const handleGrainChange = (value: string, unit: string) => {
    setGrainInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const mmValue = convertToMm(numValue, unit);
      form.setValue("grain_mm", mmValue);
    }
  };

  // Get converted values for display
  const getDeckleInMm = () => {
    const inputVal = parseFloat(deckleInputValue);
    return !isNaN(inputVal) ? convertToMm(inputVal, deckleUnit) : 0;
  };

  const getGrainInMm = () => {
    const inputVal = parseFloat(grainInputValue);
    return !isNaN(inputVal) ? convertToMm(inputVal, grainUnit) : 0;
  };

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
    selectedGroup ? (make.GroupID != null ? make.GroupID.toString() === selectedGroup : false) : true
  );
  const filteredGrades = grades.filter((grade: any) => 
    selectedMake ? (grade.Make_ID != null ? grade.Make_ID.toString() === selectedMake : false) : true
  );
  const filteredBrands = brands.filter((brand: any) => 
    selectedMake ? (brand.make_ID != null ? brand.make_ID.toString() === selectedMake : false) : true
  );

  // Handle selection changes
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

  // Update form when deal data is loaded
  useEffect(() => {
    if (dealData) {
      const deal = dealData;
      form.reset({
        groupID: deal.groupID?.toString() || "",
        MakeID: deal.MakeID?.toString() || "",
        GradeID: deal.GradeID?.toString() || "",
        BrandID: deal.BrandID?.toString() || "",
        GSM: deal.GSM || 0,
        Deckle_mm: deal.Deckle_mm || 0,
        grain_mm: deal.grain_mm || 0,
        OfferPrice: deal.OfferPrice || 0,
        OfferUnit: deal.OfferUnit || "",
        Seller_comments: deal.Seller_comments || "",
      });
      
      // Set selected values for cascading dropdowns
      setSelectedGroup(deal.groupID?.toString() || "");
      setSelectedMake(deal.MakeID?.toString() || "");

      // Set unit conversion input values (assuming data is stored in mm)
      if (deal.Deckle_mm) {
        setDeckleInputValue(deal.Deckle_mm.toString());
      }
      if (deal.grain_mm) {
        setGrainInputValue(deal.grain_mm.toString());
      }
    }
  }, [dealData, form]);

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      const payload = {
        ...data,
        groupID: parseInt(data.groupID),
        MakeID: parseInt(data.MakeID),
        GradeID: parseInt(data.GradeID),
        BrandID: parseInt(data.BrandID),
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
      queryClient.invalidateQueries({ queryKey: ["/api/seller/stats"] });
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
        <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!dealData?.deal) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Deal Not Found</h1>
            <p className="text-muted-foreground mb-4">The deal you're looking for doesn't exist or you don't have permission to edit it.</p>
            <Button onClick={() => setLocation('/seller-dashboard')}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Edit Deal</h1>
            <p className="text-muted-foreground">
              Update your deal information using the deal_master table structure.
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
                    Update the stock hierarchy for your deal
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
                                  <SelectItem key={make.MakeID} value={make.MakeID.toString()}>
                                    {make.MakeName}
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
                                  <SelectItem key={grade.GradeID} value={grade.GradeID.toString()}>
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
                                  <SelectItem key={brand.BrandID} value={brand.BrandID.toString()}>
                                    {brand.BrandName}
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

              {/* Technical Specifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Technical Specifications
                  </CardTitle>
                  <CardDescription>
                    Update the technical details for your stock
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
                          <FormLabel>
                            Deckle *
                            {deckleInputValue && (
                              <span className="text-xs text-blue-600 ml-2">
                                = {getDeckleInMm().toFixed(1)} mm
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input 
                                type="number" 
                                placeholder="650" 
                                value={deckleInputValue}
                                onChange={(e) => handleDeckleChange(e.target.value, deckleUnit)}
                                data-testid="input-deckle"
                              />
                              <Select value={deckleUnit} onValueChange={(value) => {
                                setDeckleUnit(value);
                                if (deckleInputValue) {
                                  handleDeckleChange(deckleInputValue, value);
                                }
                              }}>
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mm">mm</SelectItem>
                                  <SelectItem value="cm">cm</SelectItem>
                                  <SelectItem value="inch">inch</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
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
                          <FormLabel>
                            Grain *
                            {grainInputValue && (
                              <span className="text-xs text-blue-600 ml-2">
                                = {getGrainInMm().toFixed(1)} mm
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input 
                                type="number" 
                                placeholder="900" 
                                value={grainInputValue}
                                onChange={(e) => handleGrainChange(e.target.value, grainUnit)}
                                data-testid="input-grain"
                              />
                              <Select value={grainUnit} onValueChange={(value) => {
                                setGrainUnit(value);
                                if (grainInputValue) {
                                  handleGrainChange(grainInputValue, value);
                                }
                              }}>
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mm">mm</SelectItem>
                                  <SelectItem value="cm">cm</SelectItem>
                                  <SelectItem value="inch">inch</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
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
                    <IndianRupee className="h-5 w-5" />
                    Pricing & Details
                  </CardTitle>
                  <CardDescription>
                    Update your offer price and seller comments
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
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}