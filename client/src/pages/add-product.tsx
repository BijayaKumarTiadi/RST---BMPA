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
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, IndianRupee, Hash, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";

const dealSchema = z.object({
  groupID: z.string().min(1, "Stock group is required"),
  MakeID: z.string().optional(),
  GradeID: z.string().optional(),
  BrandID: z.string().optional(),
  makeText: z.string().min(1, "Stock make is required"),
  gradeText: z.string().min(1, "Stock grade is required"),
  brandText: z.string().min(1, "Stock brand is required"),
  GSM: z.coerce.number().min(1, "GSM is required"),
  Deckle_mm: z.coerce.number().min(1, "Deckle is required"),
  grain_mm: z.coerce.number().min(1, "Grain is required"),
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
  const { isAuthenticated } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [makeText, setMakeText] = useState("");
  const [gradeText, setGradeText] = useState("");
  const [brandText, setBrandText] = useState("");
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);

  // Unit state - single unit selector for both Deckle and Grain
  const [dimensionUnit, setDimensionUnit] = useState("cm");
  const [deckleInputValue, setDeckleInputValue] = useState("");
  const [grainInputValue, setGrainInputValue] = useState("");

  // Unit conversion functions
  const convertToMm = (value: number, unit: string): number => {
    switch (unit) {
      case "cm":
        return value * 10;
      case "inch":
        return value * 25.4;
      default:
        return value;
    }
  };

  const convertFromMm = (mmValue: number, unit: string): number => {
    switch (unit) {
      case "cm":
        return mmValue / 10;
      case "inch":
        return mmValue / 25.4;
      default:
        return mmValue;
    }
  };

  // Handle dimension changes
  const handleDeckleChange = (value: string) => {
    setDeckleInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const mmValue = convertToMm(numValue, dimensionUnit);
      form.setValue("Deckle_mm", mmValue);
    }
  };

  const handleGrainChange = (value: string) => {
    setGrainInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const mmValue = convertToMm(numValue, dimensionUnit);
      form.setValue("grain_mm", mmValue);
    }
  };

  // Get converted display values
  const getDeckleDimensions = () => {
    const inputVal = parseFloat(deckleInputValue);
    if (!isNaN(inputVal)) {
      const mmValue = convertToMm(inputVal, dimensionUnit);
      if (dimensionUnit === "cm") {
        return `${(mmValue / 25.4).toFixed(2)}" (inch)`;
      } else {
        return `${(mmValue / 10).toFixed(1)} cm`;
      }
    }
    return "";
  };

  const getGrainDimensions = () => {
    const inputVal = parseFloat(grainInputValue);
    if (!isNaN(inputVal)) {
      const mmValue = convertToMm(inputVal, dimensionUnit);
      if (dimensionUnit === "cm") {
        return `${(mmValue / 25.4).toFixed(2)}" (inch)`;
      } else {
        return `${(mmValue / 10).toFixed(1)} cm`;
      }
    }
    return "";
  };

  // Handle unit change for dimensions
  const handleUnitChange = (newUnit: string) => {
    // Convert existing values to new unit
    if (deckleInputValue) {
      const mmValue = convertToMm(parseFloat(deckleInputValue), dimensionUnit);
      const newValue = convertFromMm(mmValue, newUnit);
      setDeckleInputValue(newValue.toFixed(2));
    }
    if (grainInputValue) {
      const mmValue = convertToMm(parseFloat(grainInputValue), dimensionUnit);
      const newValue = convertFromMm(mmValue, newUnit);
      setGrainInputValue(newValue.toFixed(2));
    }
    setDimensionUnit(newUnit);
  };

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      groupID: "",
      MakeID: "",
      GradeID: "",
      BrandID: "",
      makeText: "",
      gradeText: "",
      brandText: "",
      GSM: "" as any,
      Deckle_mm: "" as any,
      grain_mm: "" as any,
      OfferPrice: "" as any,
      OfferUnit: "",
      stockType: "",
      quantity: "" as any, // No default value
      Seller_comments: "",
    },
  });

  // Fetch user settings for dimension unit preference
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Update dimension unit when user settings are loaded
  useEffect(() => {
    if (userSettings?.dimension_unit && userSettings.dimension_unit !== dimensionUnit) {
      setDimensionUnit(userSettings.dimension_unit);
    }
  }, [userSettings, dimensionUnit]);

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

  // Show all options without filtering
  const filteredMakes = makes;
  const filteredGrades = grades;
  const filteredBrands = brands;

  // Generate stock description based on selected values
  const generateStockDescription = () => {
    const formValues = form.getValues();
    const makeValue = formValues.makeText || makeText || "";
    const gradeValue = formValues.gradeText || gradeText || "";
    const brandValue = formValues.brandText || brandText || "";
    const gsmValue = formValues.GSM;

    if (makeValue && gradeValue && brandValue && gsmValue) {
      // Use spaces between components
      return `${makeValue} ${gradeValue} ${brandValue} ${gsmValue}gsm`;
    }
    return '';
  };

  // Generate normalization key (lowercase, no spaces, no dots)
  const generateNormalizationKey = () => {
    const description = generateStockDescription();
    return description.toLowerCase().replace(/[\s.]/g, '');
  };

  // Auto-populate deal description when form values change
  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      // Skip if the change was to deal_description itself to avoid infinite loop
      if (name === 'deal_description') return;
      
      const description = generateStockDescription();
      if (description && description !== form.getValues('deal_description')) {
        form.setValue('deal_description', description, { shouldValidate: false });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, makes, grades, brands]);

  // Handle selection changes
  const handleGroupChange = (value: string) => {
    setSelectedGroup(value);
    form.setValue("groupID", value);
  };

  const handleMakeChange = (value: string, item: any) => {
    if (item) {
      setSelectedMake(value);
      // Check if it's a custom text entry (when value equals the display text)
      if (value === item.make_Name) {
        // This is custom text, not an ID
        form.setValue("MakeID", "");
        form.setValue("makeText", value);
        setMakeText(value);
      } else {
        // This is a selection from dropdown
        form.setValue("MakeID", value);
        form.setValue("makeText", item.make_Name || "");
        setMakeText(item.make_Name || "");
      }
    }
  };

  const handleGradeChange = (value: string, item: any) => {
    if (item) {
      // Check if it's a custom text entry (when value equals the display text)
      if (value === item.GradeName) {
        // This is custom text, not an ID
        form.setValue("GradeID", "");
        form.setValue("gradeText", value);
        setGradeText(value);
      } else {
        // This is a selection from dropdown
        form.setValue("GradeID", value);
        form.setValue("gradeText", item.GradeName || "");
        setGradeText(item.GradeName || "");
      }
    }
  };

  const handleBrandChange = (value: string, item: any) => {
    if (item) {
      // Check if it's a custom text entry (when value equals the display text)
      if (value === item.brandname) {
        // This is custom text, not an ID
        form.setValue("BrandID", "");
        form.setValue("brandText", value);
        setBrandText(value);
      } else {
        // This is a selection from dropdown
        form.setValue("BrandID", value);
        form.setValue("brandText", item.brandname || "");
        setBrandText(item.brandname || "");
      }
    }
  };

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      // Generate descriptions and search key
      const stockDescription = generateStockDescription();
      const searchKey = generateNormalizationKey();
      
      // Debug log the form data
      console.log('Form data before submission:', {
        makeText: data.makeText,
        gradeText: data.gradeText,
        brandText: data.brandText,
        MakeID: data.MakeID,
        GradeID: data.GradeID,
        BrandID: data.BrandID
      });
      
      // Use text values directly - backend will handle as text or IDs
      const payload = {
        group_id: data.groupID ? parseInt(data.groupID) : 0,
        make_text: data.makeText || makeText || "",
        grade_text: data.gradeText || gradeText || "",
        brand_text: data.brandText || brandText || "",
        make_id: data.MakeID || data.makeText || makeText || "",
        grade_id: data.GradeID || data.gradeText || gradeText || "",
        brand_id: data.BrandID || data.brandText || brandText || "",
        deal_title: `${data.brandText || 'Stock'} - ${data.GSM}GSM`,
        stock_description: stockDescription,
        search_key: searchKey,
        deal_description: data.Seller_comments || `${data.Deckle_mm}x${data.grain_mm}mm, ${data.GSM}GSM`,
        price: data.OfferPrice,
        quantity: data.quantity,
        unit: data.OfferUnit,
        min_order_quantity: 100,
        deal_specifications: {
          GSM: data.GSM,
          Deckle_mm: data.Deckle_mm,
          grain_mm: data.grain_mm,
        },
        location: 'India',
        stock_type: data.stockType,
      };
      console.log('Payload being sent to backend:', payload);
      return apiRequest("POST", "/api/deals", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/hierarchy"] });
      
      if (saveAndAddAnother) {
        toast({
          title: "Success",
          description: "Deal added successfully! Add another deal below.",
        });
        // Reset form for next entry
        form.reset({
          groupID: "",
          MakeID: "",
          GradeID: "",
          BrandID: "",
          makeText: "",
          gradeText: "",
          brandText: "",
          GSM: "" as any,
          Deckle_mm: "" as any,
          grain_mm: "" as any,
          OfferPrice: "" as any,
          OfferUnit: "",
          stockType: "",
          quantity: "" as any,
          Seller_comments: "",
        });
        setSelectedGroup("");
        setSelectedMake("");
        setMakeText("");
        setGradeText("");
        setBrandText("");
        setDeckleInputValue("");
        setGrainInputValue("");
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
                            <AutocompleteInput
                              value={field.value}
                              onChange={handleGroupChange}
                              placeholder="Type to search groups..."
                              suggestions={groups}
                              displayField="GroupName"
                              valueField="GroupID"
                              testId="input-group"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="makeText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Stock Make <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              value={makeText}
                              onChange={(value) => {
                                form.setValue("MakeID", value);
                                form.setValue("makeText", value);
                                setMakeText(value);
                              }}
                              onSelect={handleMakeChange}
                              onTextChange={(text) => {
                                form.setValue("makeText", text);
                                form.setValue("MakeID", "");
                                setMakeText(text);
                              }}
                              placeholder="Type to search or enter make..."
                              suggestions={filteredMakes}
                              displayField="make_Name"
                              valueField="make_ID"
                              testId="input-make"
                              allowFreeText={true}
                            />
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
                      name="gradeText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Grade <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              value={gradeText}
                              onChange={(value) => {
                                form.setValue("GradeID", value);
                                form.setValue("gradeText", value);
                                setGradeText(value);
                              }}
                              onSelect={handleGradeChange}
                              onTextChange={(text) => {
                                form.setValue("gradeText", text);
                                form.setValue("GradeID", "");
                                setGradeText(text);
                              }}
                              placeholder="Type to search or enter grade..."
                              suggestions={filteredGrades}
                              displayField="GradeName"
                              valueField="gradeID"
                              testId="input-grade"
                              allowFreeText={true}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brandText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Brand <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              value={brandText}
                              onChange={(value) => {
                                form.setValue("BrandID", value);
                                form.setValue("brandText", value);
                                setBrandText(value);
                              }}
                              onSelect={handleBrandChange}
                              onTextChange={(text) => {
                                form.setValue("brandText", text);
                                form.setValue("BrandID", "");
                                setBrandText(text);
                              }}
                              placeholder="Type to search or enter brand..."
                              suggestions={filteredBrands}
                              displayField="brandname"
                              valueField="brandID"
                              testId="input-brand"
                              allowFreeText={true}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Third Row: Stock Type and Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="stockType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Stock Type <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              value={field.value}
                              onChange={(value) => form.setValue("stockType", value)}
                              placeholder="Type reel or sheet..."
                              suggestions={[
                                { value: "reel", label: "Reel" },
                                { value: "sheet", label: "Sheet" }
                              ]}
                              displayField="label"
                              valueField="value"
                              testId="input-stock-type"
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
                          <FormLabel className="text-foreground">Description (Auto-generated)</FormLabel>
                          <FormControl>
                            <Input 
                              value={field.value || generateStockDescription()}
                              readOnly
                              className="bg-muted border-border text-foreground cursor-not-allowed"
                              placeholder="Auto-generated from selections"
                              data-testid="input-description"
                            />
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="GSM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">GSM <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 180" 
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
                            Deckle ({dimensionUnit}) <span className="text-red-500">*</span>
                            {deckleInputValue && (
                              <span className="text-xs text-muted-foreground ml-2">
                                = {getDeckleDimensions()}
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder={dimensionUnit === "cm" ? "65" : "25.59"} 
                              value={deckleInputValue}
                              onChange={(e) => handleDeckleChange(e.target.value)}
                              data-testid="input-deckle"
                              className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
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
                          <FormLabel className="text-foreground">
                            Grain ({dimensionUnit}) <span className="text-red-500">*</span>
                            {grainInputValue && (
                              <span className="text-xs text-muted-foreground ml-2">
                                = {getGrainDimensions()}
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder={dimensionUnit === "cm" ? "100" : "39.37"} 
                              value={grainInputValue}
                              onChange={(e) => handleGrainChange(e.target.value)}
                              data-testid="input-grain"
                              className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel className="text-foreground">Dimension Unit</FormLabel>
                      <Select value={dimensionUnit} onValueChange={handleUnitChange}>
                        <SelectTrigger className="bg-popover border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="cm" className="text-foreground hover:bg-accent">cm</SelectItem>
                          <SelectItem value="inch" className="text-foreground hover:bg-accent">inch</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing and Inventory */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <IndianRupee className="h-5 w-5" />
                    Pricing and Inventory
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Set your pricing and available quantity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="OfferPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">Offer Price (₹) <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="Enter price" 
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
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              data-testid="select-unit"
                            >
                              <SelectTrigger className="bg-popover border-border text-foreground">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="Kg" className="text-foreground hover:bg-accent">Kg</SelectItem>
                                <SelectItem value="Sheet" className="text-foreground hover:bg-accent">Sheet</SelectItem>
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
                              placeholder="Enter quantity" 
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
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Additional Information
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Add any additional comments or details about the stock
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="Seller_comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Seller Comments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any special notes, delivery terms, or additional specifications..."
                            className="min-h-[100px] bg-popover border-border text-foreground placeholder:text-muted-foreground"
                            {...field}
                            data-testid="textarea-comments"
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
                <CardContent className="pt-6">
                  <div className="flex gap-4 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/seller-dashboard")}
                      className="border-border text-foreground hover:bg-secondary"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={form.handleSubmit(onSubmitAndAddAnother)}
                      disabled={createDealMutation.isPending}
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      data-testid="button-save-add"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Save & Add Another
                    </Button>
                    <Button
                      type="submit"
                      disabled={createDealMutation.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      data-testid="button-save"
                    >
                      {createDealMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Saving...
                        </>
                      ) : (
                        "Save Deal"
                      )}
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