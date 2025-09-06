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
import { ArrowLeft, Package, IndianRupee, Hash, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import Navigation from "@/components/navigation";

const dealSchema = z.object({
  groupID: z.string().min(1, "Stock group is required"),
  MakeID: z.string().min(1, "Stock make is required"),
  GradeID: z.string().min(1, "Stock grade is required"),
  BrandID: z.string().min(1, "Stock brand is required"),
  GSM: z.coerce.number().min(1, "GSM is required"),
  Deckle_mm: z.coerce.number().min(1, "Deckle (mm) is required"),
  grain_mm: z.coerce.number().min(1, "Grain (mm) is required"),
  deal_description: z.string().optional(),
  OfferPrice: z.coerce.number().min(0.01, "Offer price must be greater than 0"),
  OfferUnit: z.string().min(1, "Unit is required"),
  stockType: z.string().min(1, "Stock type is required"),
  quantity: z.coerce.number().min(1, "Quantity is required"),
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

  // Unit conversion state - only cm and inch
  const [deckleUnit, setDeckleUnit] = useState("cm");
  const [grainUnit, setGrainUnit] = useState("cm");
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
      GSM: "" as any,
      Deckle_mm: "" as any,
      grain_mm: "" as any,
      OfferPrice: "" as any,
      OfferUnit: "",
      stockType: "",
      quantity: 1000,
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

  // Generate stock description based on selected values
  const generateStockDescription = () => {
    const formValues = form.getValues();
    const selectedGroupObj = groups.find((g: any) => g.GroupID.toString() === formValues.groupID);
    const selectedMakeObj = makes.find((m: any) => m.make_ID.toString() === formValues.MakeID);
    const selectedGradeObj = grades.find((g: any) => g.gradeID.toString() === formValues.GradeID);
    const selectedBrandObj = brands.find((b: any) => b.brandID.toString() === formValues.BrandID);

    if (selectedGroupObj && selectedMakeObj && selectedGradeObj && selectedBrandObj && formValues.GSM) {
      return `${selectedBrandObj.brandname} ${selectedGradeObj.GradeName} ${selectedGroupObj.GroupName} - ${formValues.GSM}GSM, ${formValues.Deckle_mm}x${formValues.grain_mm}mm, ${formValues.quantity} ${formValues.OfferUnit} available`;
    }
    return '';
  };

  // Auto-populate deal description when form values change
  useEffect(() => {
    const subscription = form.watch((values) => {
      const description = generateStockDescription();
      if (description && description !== form.getValues('deal_description')) {
        form.setValue('deal_description', description);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, groups, makes, grades, brands]);

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
        group_id: data.groupID ? parseInt(data.groupID) : 0,
        make_id: data.MakeID ? parseInt(data.MakeID) : 0,
        grade_id: data.GradeID ? parseInt(data.GradeID) : 0,
        brand_id: data.BrandID ? parseInt(data.BrandID) : 0,
        deal_title: `${brands.find((b: any) => b.brandID == data.BrandID)?.brandname || 'Stock'} - ${data.GSM}GSM`,
        deal_description: data.Seller_comments || `${data.Deckle_mm}x${data.grain_mm}mm, ${data.GSM}GSM`,
        stock_description: generateStockDescription(), // Auto-generated description
        price: data.OfferPrice,
        quantity: data.quantity, // Use form quantity value
        unit: data.OfferUnit,
        min_order_quantity: 100, // Default min order quantity
        deal_specifications: {
          GSM: data.GSM,
          Deckle_mm: data.Deckle_mm,
          grain_mm: data.grain_mm,
        },
        location: 'India', // Default location
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
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/seller-dashboard">
              <Button variant="ghost" className="mb-4 text-foreground hover:bg-secondary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">Add Stock</h1>
              <p className="text-muted-foreground">
                Add your stock inventory to the marketplace. Fill in the details below to create a new deal that buyers can discover.
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Stock Selection */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Package className="h-5 w-5" />
                    Stock Details
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* First Row: Group and Make */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="groupID"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Stock Group <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={handleGroupChange}
                              data-testid="select-group"
                            >
                              <SelectTrigger className="bg-popover border-border text-foreground">
                                <SelectValue placeholder="Select group" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                {groups.map((group: any) => (
                                  group.GroupID != null ? (
                                    <SelectItem 
                                      key={group.GroupID} 
                                      value={group.GroupID.toString()}
                                      className="text-foreground hover:bg-accent"
                                    >
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
                          <FormLabel className="text-foreground">Stock Make <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={handleMakeChange}
                              disabled={!selectedGroup}
                              data-testid="select-make"
                            >
                              <SelectTrigger className="bg-popover border-border text-foreground">
                                <SelectValue placeholder="Select make" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                {filteredMakes.map((make: any) => (
                                  make.make_ID != null ? (
                                    <SelectItem 
                                      key={make.make_ID} 
                                      value={make.make_ID.toString()}
                                      className="text-foreground hover:bg-accent"
                                    >
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

                  </div>

                  {/* Second Row: Grade and Brand */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="GradeID"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Grade <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              disabled={!selectedMake}
                              data-testid="select-grade"
                            >
                              <SelectTrigger className="bg-popover border-border text-foreground">
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                {filteredGrades.map((grade: any) => (
                                  grade.gradeID != null ? (
                                    <SelectItem 
                                      key={grade.gradeID} 
                                      value={grade.gradeID.toString()}
                                      className="text-foreground hover:bg-accent"
                                    >
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
                          <FormLabel className="text-foreground">Brand <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              disabled={!selectedMake}
                              data-testid="select-brand"
                            >
                              <SelectTrigger className="bg-popover border-border text-foreground">
                                <SelectValue placeholder="Select brand" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                {filteredBrands.map((brand: any) => (
                                  brand.brandID != null ? (
                                    <SelectItem 
                                      key={brand.brandID} 
                                      value={brand.brandID.toString()}
                                      className="text-foreground hover:bg-accent"
                                    >
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

                  {/* Third Row: Stock Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="stockType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Stock Type <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              data-testid="select-stock-type"
                            >
                              <SelectTrigger className="bg-popover border-border text-foreground">
                                <SelectValue placeholder="Select reel or sheet" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="reel" className="text-foreground hover:bg-accent">
                                  Reel
                                </SelectItem>
                                <SelectItem value="sheet" className="text-foreground hover:bg-accent">
                                  Sheet
                                </SelectItem>
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
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Hash className="h-5 w-5" />
                    Technical Specifications
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Enter the technical details for your stock
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="GSM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">GSM <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 80" 
                              {...field}
                              data-testid="input-gsm"
                              className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
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
                          <FormLabel className="text-foreground">
                            Deckle <span className="text-red-500">*</span> (cm and inch)
                            {deckleInputValue && (
                              <span className="text-xs text-blue-600 ml-2">
                                = {(getDeckleInMm()/10).toFixed(1)} cm | {(getDeckleInMm()/25.4).toFixed(2)}"
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
                                className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                              />
                              <Select value={deckleUnit} onValueChange={(value) => {
                                setDeckleUnit(value);
                                if (deckleInputValue) {
                                  handleDeckleChange(deckleInputValue, value);
                                }
                              }}>
                                <SelectTrigger className="w-20 bg-popover border-border">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
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
                          <FormLabel className="text-foreground">
                            Grain <span className="text-red-500">*</span> (cm and inch)
                            {grainInputValue && (
                              <span className="text-xs text-blue-600 ml-2">
                                = {(getGrainInMm()/10).toFixed(1)} cm | {(getGrainInMm()/25.4).toFixed(2)}"
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
                                className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                              />
                              <Select value={grainUnit} onValueChange={(value) => {
                                setGrainUnit(value);
                                if (grainInputValue) {
                                  handleGrainChange(grainInputValue, value);
                                }
                              }}>
                                <SelectTrigger className="w-20 bg-popover border-border">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
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
                  
                  {/* Deal Description - Full Width */}
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="deal_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Deal Description</FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              placeholder="Description will be auto-generated based on your selections above..."
                              rows={3}
                              className="w-full px-3 py-2 border border-border rounded-md bg-popover text-foreground placeholder:text-muted-foreground resize-none"
                              data-testid="textarea-deal-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pricing & Details */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <IndianRupee className="h-5 w-5" />
                    Pricing & Details
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Set your offer price and add any seller comments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="OfferPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Offer Price <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="e.g., 45.50" 
                              {...field}
                              data-testid="input-price"
                              className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
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
                          <FormLabel className="text-foreground">Unit <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange} data-testid="select-unit">
                              <SelectTrigger className="bg-popover border-border text-foreground">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="kg" className="text-foreground hover:bg-accent">Kg</SelectItem>
                                <SelectItem value="ton" className="text-foreground hover:bg-accent">Ton</SelectItem>
                                <SelectItem value="ream" className="text-foreground hover:bg-accent">Ream</SelectItem>
                                <SelectItem value="sheet" className="text-foreground hover:bg-accent">Sheet</SelectItem>
                                <SelectItem value="bundle" className="text-foreground hover:bg-accent">Bundle</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Quantity <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 1000" 
                              {...field}
                              data-testid="input-quantity"
                              className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                            />
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
                        <FormLabel className="text-foreground">Seller Comments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any additional details about the stock..."
                            {...field}
                            data-testid="input-comments"
                            className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Save Options</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Choose how you want to proceed after saving this deal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      type="submit"
                      className="h-12 bg-blue-600 hover:bg-blue-700 text-foreground"
                      disabled={createDealMutation.isPending}
                      data-testid="button-submit"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      {createDealMutation.isPending ? "Saving..." : "Save & Go to Dashboard"}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-12 bg-popover hover:bg-accent text-foreground border-border"
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
                      className="w-full bg-popover border-border text-foreground hover:bg-accent"
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