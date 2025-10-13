import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { ArrowLeft, Package, IndianRupee, Hash, Save } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import Navigation from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";

// Helper function to normalize make text for craft detection
const normalizeMakeText = (text: string): string => {
  return text.toLowerCase().trim().replace(/[.\s]+/g, ' ');
};

// Helper function to check if make is craft type
const isCraftMake = (makeText: string): boolean => {
  const normalized = normalizeMakeText(makeText);
  return normalized === 'craft reel' ||
         normalized === 'craft paper b s' ||
         normalized === 'craft paper bs';
};

// Helper function to check if group is Kraft Reel
const isKraftReelGroup = (groupName: string): boolean => {
  return groupName?.toLowerCase().trim() === 'kraft reel';
};

// Helper function to check if group is Spare Part
const isSparePartGroup = (groupName: string): boolean => {
  return groupName?.toLowerCase().trim() === 'spare part';
};

// Single validation schema with conditional validation
const dealSchema = z.object({
  groupID: z.string().min(1, "Product group is required"),
  groupName: z.string().optional(),
  // Regular product fields
  MakeID: z.string().optional(),
  GradeID: z.string().optional(),
  BrandID: z.string().optional(),
  makeText: z.string().optional(),
  gradeText: z.string().optional(),
  brandText: z.string().optional(),
  GSM: z.coerce.number().optional(),
  Deckle_mm: z.coerce.number().optional(),
  grain_mm: z.coerce.number().optional(),
  // Spare part specific fields
  spareMake: z.string().optional(),
  machineName: z.string().optional(),
  sparePartDescription: z.string().optional(),
  spareAge: z.string().optional(),
  spareBrand: z.string().optional(),
  // Common fields
  deal_description: z.string().optional(),
  OfferPrice: z.coerce.number().min(0.01, "Offer price must be greater than 0"),
  OfferUnit: z.string().min(1, "Unit is required"),
  quantity: z.coerce.number().min(1, "Quantity is required"),
  stockAge: z.coerce.number().min(0, "Stock Age must be 0 or greater").optional(),
  Seller_comments: z.string().optional(),
}).superRefine((data, ctx) => {
  const isKraftReel = isKraftReelGroup(data.groupName || '');
  const isSparePart = isSparePartGroup(data.groupName || '');
  
  if (isSparePart) {
    // Spare part validations
    if (!data.spareMake || data.spareMake.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Make is required",
        path: ["spareMake"]
      });
    }
    if (!data.machineName || data.machineName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Machine name is required",
        path: ["machineName"]
      });
    }
    if (!data.sparePartDescription || data.sparePartDescription.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Spare part description is required",
        path: ["sparePartDescription"]
      });
    }
  } else {
    // Regular product validations
    if (!data.makeText || data.makeText.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Product make is required",
        path: ["makeText"]
      });
    }
    if (!data.GSM || data.GSM < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GSM is required",
        path: ["GSM"]
      });
    }
    if (!data.Deckle_mm || data.Deckle_mm < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deckle is required",
        path: ["Deckle_mm"]
      });
    }
    if (!data.grain_mm && data.grain_mm !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Grain is required",
        path: ["grain_mm"]
      });
    }
    
    // Grade validation - required unless Kraft Reel
    if (!isKraftReel && (!data.gradeText || data.gradeText.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Grade is required",
        path: ["gradeText"]
      });
    }
    
    // Grain validation - allow 0 only for Kraft Reel (for "B.S." value)
    if (!isKraftReel && data.grain_mm! <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Grain must be greater than 0",
        path: ["grain_mm"]
      });
    }

    // Brand validation - not required for Kraft Reel only
    if (!isKraftReel && (!data.brandText || data.brandText.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Brand is required",
        path: ["brandText"]
      });
    }
  }
});

type DealFormData = z.infer<typeof dealSchema>;

export default function EditDeal() {
  const params = useParams();
  const dealId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [makeText, setMakeText] = useState("");
  const [gradeText, setGradeText] = useState("");
  const [brandText, setBrandText] = useState("");
  const [isGradeAutoSet, setIsGradeAutoSet] = useState(false);
  const [isKraftReelAutoSet, setIsKraftReelAutoSet] = useState(false);

  // Guard clause: redirect if no dealId is provided
  if (!dealId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Invalid Deal ID</h1>
            <p className="text-muted-foreground mb-4">No deal ID was provided in the URL.</p>
            <Button onClick={() => setLocation('/seller-dashboard')} data-testid="button-back-dashboard">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
      groupName: "",
      MakeID: "",
      GradeID: "",
      BrandID: "",
      makeText: "",
      gradeText: "",
      brandText: "",
      GSM: "" as any,
      Deckle_mm: "" as any,
      grain_mm: "" as any,
      spareMake: "",
      machineName: "",
      sparePartDescription: "",
      spareAge: "",
      spareBrand: "",
      OfferPrice: "" as any,
      OfferUnit: "",
      quantity: "" as any,
      stockAge: "" as any,
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

  // Watch form values for craft detection and Kraft Reel logic
  const currentMakeText = form.watch("makeText");
  const currentGradeText = form.watch("gradeText");
  const currentGroupName = form.watch("groupName");
  
  // Update dimension unit when user settings are loaded
  useEffect(() => {
    if (userSettings?.dimension_unit && userSettings.dimension_unit !== dimensionUnit) {
      setDimensionUnit(userSettings.dimension_unit);
    }
  }, [userSettings, dimensionUnit]);
  
  // Handle craft reel/craft paper B.S. auto-grade setting
  useEffect(() => {
    if (currentMakeText && isCraftMake(currentMakeText) && !isKraftReelGroup(currentGroupName || '')) {
      if (!currentGradeText || isGradeAutoSet || currentGradeText === "Craft Paper") {
        form.setValue("gradeText", "Craft Paper");
        form.setValue("GradeID", "");
        setGradeText("Craft Paper");
        setIsGradeAutoSet(true);
      }
    } else if (isGradeAutoSet && currentGradeText === "Craft Paper") {
      form.setValue("gradeText", "");
      form.setValue("GradeID", "");
      setGradeText("");
      setIsGradeAutoSet(false);
    }
  }, [currentMakeText, currentGradeText, isGradeAutoSet, currentGroupName, form]);

  // Handle Kraft Reel Group auto-grade setting
  useEffect(() => {
    if (currentGroupName && isKraftReelGroup(currentGroupName || '')) {
      if (!currentGradeText || isKraftReelAutoSet || currentGradeText === "Kraft Paper") {
        form.setValue("gradeText", "Kraft Paper");
        form.setValue("GradeID", "");
        setGradeText("Kraft Paper");
        setIsKraftReelAutoSet(true);
        setIsGradeAutoSet(false);
      }
    } else if (isKraftReelAutoSet && currentGradeText === "Kraft Paper") {
      form.setValue("gradeText", "");
      form.setValue("GradeID", "");
      setGradeText("");
      setIsKraftReelAutoSet(false);
    }
  }, [currentGroupName, currentGradeText, isKraftReelAutoSet, form]);

  // Handle Kraft Reel Group specific auto-settings
  useEffect(() => {
    if (currentGroupName && isKraftReelGroup(currentGroupName || '')) {
      form.setValue("OfferUnit", "Kg");
    }
  }, [currentGroupName, form]);

  // Fetch deal data for editing
  const { data: dealData, isLoading: dealLoading } = useQuery({
    queryKey: ["/api/deals", dealId!],
    queryFn: async () => {
      const response = await fetch(`/api/deals/${dealId!}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch deal');
      return response.json();
    },
    enabled: !!dealId,
  });

  // Fetch stock hierarchy
  const { data: stockHierarchy, isLoading: hierarchyLoading, error: hierarchyError } = useQuery({
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
    const groupName = formValues.groupName || selectedGroupName || "";

    // Special handling for Kraft Reel products
    if (isKraftReelGroup(groupName)) {
      if (makeValue && gradeValue && gsmValue) {
        if (brandValue) {
          return `${makeValue} ${gradeValue} ${brandValue} ${gsmValue}gsm`;
        } else {
          return `${makeValue} ${gradeValue} ${gsmValue}gsm`;
        }
      }
    } else {
      if (makeValue && gradeValue && brandValue && gsmValue) {
        return `${makeValue} ${gradeValue} ${brandValue} ${gsmValue}gsm`;
      }
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
      if (name === 'deal_description') return;
      
      const description = generateStockDescription();
      if (description && description !== form.getValues('deal_description')) {
        form.setValue('deal_description', description, { shouldValidate: false });
      }
    });
    return () => subscription.unsubscribe();
  }, [form, makes, grades, brands]);

  // Handle selection changes
  const handleGroupChange = (value: string, item?: any) => {
    setSelectedGroup(value);
    form.setValue("groupID", value);
    
    const groupName = item?.GroupName || value;
    setSelectedGroupName(groupName);
    form.setValue("groupName", groupName);
  };

  const handleMakeChange = (value: string, item: any) => {
    if (item) {
      setSelectedMake(value);
      
      if (item.make_ID) {
        form.setValue("MakeID", String(item.make_ID));
        form.setValue("makeText", item.make_Name || "");
        setMakeText(item.make_Name || "");
      } else {
        form.setValue("MakeID", "");
        form.setValue("makeText", value);
        setMakeText(value);
      }
    }
  };

  const handleGradeChange = (value: string, item: any) => {
    if (item) {
      if (value === item.GradeName) {
        form.setValue("GradeID", "");
        form.setValue("gradeText", value);
        setGradeText(value);
      } else {
        form.setValue("GradeID", String(value));
        form.setValue("gradeText", item.GradeName || "");
        setGradeText(item.GradeName || "");
      }
    }
  };

  const handleBrandChange = (value: string, item: any) => {
    if (item) {
      if (value === item.brandname) {
        form.setValue("BrandID", "");
        form.setValue("brandText", value);
        setBrandText(value);
      } else {
        form.setValue("BrandID", String(value));
        form.setValue("brandText", item.brandname || "");
        setBrandText(item.brandname || "");
      }
    }
  };

  // Update form when deal data is loaded
  useEffect(() => {
    if (dealData && stockHierarchy) {
      const deal = dealData;
      
      // Set selected values for cascading dropdowns FIRST
      const groupId = deal.groupID?.toString() || "";
      
      // Get group name
      const groupObj = groups.find((g: any) => g.GroupID?.toString() === groupId);
      const groupName = groupObj?.GroupName || "";
      setSelectedGroupName(groupName);
      setSelectedGroup(groupId);
      
      // Check if this is a spare part
      const isSparePart = isSparePartGroup(groupName);
      
      if (isSparePart) {
        // Load spare part data
        const formValues = {
          groupID: groupId,
          groupName: groupName,
          spareMake: deal.Make || "",
          machineName: deal.Grade || "",
          sparePartDescription: deal.Seller_comments || "",
          spareAge: deal.StockAge?.toString() || "",
          spareBrand: deal.Brand || "",
          OfferPrice: Number(deal.OfferPrice) || 0,
          OfferUnit: deal.OfferUnit || "",
          quantity: Number(deal.quantity) || 0,
          stockAge: Number(deal.StockAge) || 0,
          Seller_comments: deal.Seller_comments || "",
        };
        
        form.reset(formValues);
      } else {
        // Regular product data loading
        // Extract text values from the deal data
        let makeTextValue = deal.Make || "";
        let gradeTextValue = deal.Grade || "";
        let brandTextValue = deal.Brand || "";
        
        // Find IDs from hierarchy based on text values
        let makeId = "";
        let gradeId = "";
        let brandId = "";
        
        // Find makeId from text
        if (makeTextValue) {
          const makeObj = makes.find((m: any) =>
            m.make_Name?.toLowerCase() === makeTextValue.toLowerCase()
          );
          makeId = makeObj?.make_ID?.toString() || "";
        }
        
        // If no makeId found, try using MakeID field if it exists
        if (!makeId && deal.MakeID) {
          makeId = deal.MakeID.toString();
          const makeObj = makes.find((m: any) => m.make_ID?.toString() === makeId);
          if (makeObj) {
            makeTextValue = makeObj.make_Name || makeTextValue;
          }
        }
        
        setSelectedMake(makeId);
        
        // Find gradeId from text
        if (gradeTextValue && makeId) {
          const gradeObj = grades.find((g: any) =>
            g.GradeName?.toLowerCase() === gradeTextValue.toLowerCase() &&
            g.Make_ID?.toString() === makeId
          );
          gradeId = gradeObj?.gradeID?.toString() || "";
        }
        
        // If no gradeId found, try using GradeID field if it exists
        if (!gradeId && deal.GradeID) {
          gradeId = deal.GradeID.toString();
          const gradeObj = grades.find((g: any) => g.gradeID?.toString() === gradeId);
          if (gradeObj) {
            gradeTextValue = gradeObj.GradeName || gradeTextValue;
          }
        }
        
        // Find brandId from text
        if (brandTextValue && makeId) {
          const brandObj = brands.find((b: any) =>
            b.brandname?.toLowerCase() === brandTextValue.toLowerCase() &&
            b.make_ID?.toString() === makeId
          );
          brandId = brandObj?.brandID?.toString() || "";
        }
        
        // If no brandId found, try using BrandID field if it exists
        if (!brandId && deal.BrandID) {
          brandId = deal.BrandID.toString();
          const brandObj = brands.find((b: any) => b.brandID?.toString() === brandId);
          if (brandObj) {
            brandTextValue = brandObj.brandname || brandTextValue;
          }
        }
        
        // Set text state values
        setMakeText(makeTextValue);
        setGradeText(gradeTextValue);
        setBrandText(brandTextValue);
        
        // Set form values with proper type conversions
        const formValues = {
          groupID: groupId,
          groupName: groupName,
          MakeID: makeId || makeTextValue,
          GradeID: gradeId || gradeTextValue,
          BrandID: brandId || brandTextValue,
          makeText: makeTextValue,
          gradeText: gradeTextValue,
          brandText: brandTextValue,
          GSM: Number(deal.GSM) || 0,
          Deckle_mm: Number(deal.Deckle_mm) || 0,
          grain_mm: Number(deal.grain_mm) || 0,
          OfferPrice: Number(deal.OfferPrice) || 0,
          OfferUnit: deal.OfferUnit || "",
          quantity: Number(deal.quantity) || 0,
          stockAge: Number(deal.StockAge) || 0,
          Seller_comments: deal.Seller_comments || "",
        };
        
        form.reset(formValues);

        // Set unit conversion input values - convert from mm to user's preferred unit
        if (deal.Deckle_mm) {
          const mmValue = Number(deal.Deckle_mm);
          const convertedValue = convertFromMm(mmValue, dimensionUnit);
          setDeckleInputValue(convertedValue.toFixed(2));
        }
        if (deal.grain_mm) {
          const mmValue = Number(deal.grain_mm);
          const convertedValue = convertFromMm(mmValue, dimensionUnit);
          setGrainInputValue(convertedValue.toFixed(2));
        }
      }
    }
  }, [dealData, stockHierarchy, form, makes, grades, brands]);

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      const isSparePart = isSparePartGroup(data.groupName || '');
      
      if (isSparePart) {
        // Spare Part update
        const spareDescription = `${data.spareMake} - ${data.machineName}`;
        const searchKey = spareDescription.toLowerCase().replace(/[\s.]/g, '');
        
        const payload = {
          group_id: data.groupID ? parseInt(data.groupID) : 0,
          is_spare_part: true,
          spare_make: data.spareMake,
          machine_name: data.machineName,
          spare_description: data.sparePartDescription,
          spare_age: data.spareAge || '',
          spare_brand: data.spareBrand || '',
          deal_title: spareDescription,
          stock_description: spareDescription,
          search_key: searchKey,
          deal_description: data.Seller_comments || data.sparePartDescription || '',
          price: data.OfferPrice,
          quantity: data.quantity,
          unit: data.OfferUnit,
          StockAge: data.stockAge || 0,
          location: 'India',
        };
        
        console.log('📤 SPARE PART UPDATE PAYLOAD:', payload);
        return apiRequest("PUT", `/api/deals/${dealId!}`, payload);
      } else {
        // Regular product update
        const stockDescription = generateStockDescription();
        const searchKey = generateNormalizationKey();
        
        const payload = {
          group_id: data.groupID ? parseInt(data.groupID) : 0,
          groupID: data.groupID ? parseInt(data.groupID) : 0,
          make_text: data.makeText || makeText || "",
          grade_text: data.gradeText || gradeText || "",
          brand_text: data.brandText || brandText || "",
          make_id: data.MakeID || data.makeText || makeText || "",
          grade_id: data.GradeID || data.gradeText || gradeText || "",
          brand_id: data.BrandID || data.brandText || brandText || "",
          GSM: data.GSM,
          Deckle_mm: data.Deckle_mm,
          grain_mm: data.grain_mm,
          OfferPrice: data.OfferPrice,
          OfferUnit: data.OfferUnit,
          quantity: data.quantity,
          StockAge: data.stockAge || 0,
          Seller_comments: data.Seller_comments || "",
          deal_title: `${data.brandText || 'Stock'} - ${data.GSM}GSM`,
          stock_description: stockDescription,
          search_key: searchKey,
          deal_description: data.Seller_comments || `${data.Deckle_mm}x${data.grain_mm}mm, ${data.GSM}GSM`,
          price: data.OfferPrice,
          unit: data.OfferUnit,
          min_order_quantity: 100,
          deal_specifications: {
            GSM: data.GSM,
            Deckle_mm: data.Deckle_mm,
            grain_mm: data.grain_mm,
          },
          location: 'India',
        };
        
        console.log('📤 Frontend Update Payload:', payload);
        return apiRequest("PUT", `/api/deals/${dealId!}`, payload);
      }
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

  if (!dealData) {
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
              {/* Conditional rendering based on category */}
              {isSparePartGroup(currentGroupName || '') ? (
                /* Spare Part Form */
                <>
                  {/* Spare Part Details */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Package className="h-5 w-5" />
                        Spare Part Details
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Enter details about the spare part
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Product Group Field */}
                      <FormField
                        control={form.control}
                        name="groupID"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Product Group <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <AutocompleteInput
                                key={`group-${selectedGroup}`}
                                value={selectedGroupName || field.value}
                                onChange={(value) => {
                                  setSelectedGroup(value);
                                  form.setValue("groupID", value);
                                }}
                                onSelect={(value, item) => {
                                  handleGroupChange(value, item);
                                }}
                                onTextChange={(text) => {
                                  setSelectedGroupName(text);
                                  form.setValue("groupName", text);
                                }}
                                placeholder="Type to search groups..."
                                suggestions={groups}
                                displayField="GroupName"
                                valueField="GroupID"
                                testId="input-group"
                                allowFreeText={true}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* First Row: Make and Machine Name */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Controller
                          control={form.control}
                          name="spareMake"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Make <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Enter make (e.g., Siemens, ABB)"
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                                />
                              </FormControl>
                              {fieldState.error && (
                                <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                              )}
                            </FormItem>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="machineName"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Machine Name <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Enter machine name"
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                                />
                              </FormControl>
                              {fieldState.error && (
                                <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                              )}
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Second Row: Spare Part Description */}
                      <FormField
                        control={form.control}
                        name="sparePartDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Spare Part Description <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter detailed description of the spare part"
                                className="min-h-[100px] bg-popover border-border text-foreground placeholder:text-muted-foreground"
                                value={field.value || ''}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Third Row: Age and Brand */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="spareAge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">
                                Age
                                <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter age (e.g., 2 years, New)"
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                  className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="spareBrand"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">
                                Brand
                                <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter brand"
                                  value={field.value || ''}
                                  onChange={field.onChange}
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

                  {/* Pricing and Inventory (same for both) */}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Controller
                          control={form.control}
                          name="OfferPrice"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Offer Price (₹) <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Enter price"
                                  value={field.value || ""}
                                  onChange={field.onChange}
                                  data-testid="input-price"
                                  className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                                />
                              </FormControl>
                              {fieldState.error && (
                                <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                              )}
                            </FormItem>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="OfferUnit"
                          render={({ field, fieldState }) => (
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
                                    <SelectItem value="Piece" className="text-foreground hover:bg-accent">Piece</SelectItem>
                                    <SelectItem value="Set" className="text-foreground hover:bg-accent">Set</SelectItem>
                                    <SelectItem value="Unit" className="text-foreground hover:bg-accent">Unit</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              {fieldState.error && (
                                <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                              )}
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        <FormField
                          control={form.control}
                          name="stockAge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">
                                Stock Age (days)
                                <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Enter stock age in days (e.g., 30)"
                                  {...field}
                                  data-testid="input-stock-age"
                                  className="bg-popover border-border text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Information (same for both) */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">
                        Additional Information
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Add any additional comments or details
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
                </>
              ) : (
                /* Regular Product Form */
                <>
              {/* Stock Selection */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Package className="h-5 w-5" />
                    Offer Details
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
                          <FormLabel className="text-foreground">Product Group <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              key={`group-${selectedGroup}`}
                              value={selectedGroupName || field.value}
                              onChange={(value) => {
                                setSelectedGroup(value);
                                form.setValue("groupID", value);
                              }}
                              onSelect={(value, item) => {
                                handleGroupChange(value, item);
                              }}
                              onTextChange={(text) => {
                                setSelectedGroupName(text);
                                form.setValue("groupName", text);
                              }}
                              placeholder="Type to search groups..."
                              suggestions={groups}
                              displayField="GroupName"
                              valueField="GroupID"
                              testId="input-group"
                              allowFreeText={true}
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
                          <FormLabel className="text-foreground">Product Make <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              key={`make-${makeText}`}
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
                          <FormLabel className="text-foreground">
                            Grade {isKraftReelGroup(currentGroupName || '') ? "(Auto-filled)" : <span className="text-red-500">*</span>}
                          </FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              key={`grade-${gradeText}`}
                              value={gradeText}
                              onChange={(value) => {
                                if (!isKraftReelGroup(currentGroupName || '')) {
                                  form.setValue("GradeID", value);
                                  form.setValue("gradeText", value);
                                  setGradeText(value);
                                }
                              }}
                              onSelect={handleGradeChange}
                              onTextChange={(text) => {
                                if (!isKraftReelGroup(currentGroupName || '')) {
                                  form.setValue("gradeText", text);
                                  form.setValue("GradeID", "");
                                  setGradeText(text);
                                }
                              }}
                              placeholder={isKraftReelGroup(currentGroupName || '') ? "Kraft Paper (auto-filled)" : "Type to search or enter grade..."}
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
                          <FormLabel className="text-foreground">
                            Brand {isKraftReelGroup(currentGroupName || '') || isCraftMake(currentMakeText || "") ? "(Optional)" : <span className="text-red-500">*</span>}
                          </FormLabel>
                          <FormControl>
                            <AutocompleteInput
                              key={`brand-${brandText}`}
                              value={brandText}
                              onChange={(value) => {
                                if (!isKraftReelGroup(currentGroupName || '')) {
                                  form.setValue("BrandID", value);
                                  form.setValue("brandText", value);
                                  setBrandText(value);
                                }
                              }}
                              onSelect={handleBrandChange}
                              onTextChange={(text) => {
                                if (!isKraftReelGroup(currentGroupName || '')) {
                                  form.setValue("brandText", text);
                                  form.setValue("BrandID", "");
                                  setBrandText(text);
                                }
                              }}
                              placeholder={isKraftReelGroup(currentGroupName || '') ? "Not required for Kraft Reel" : "Type to search or enter brand..."}
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

                  {/* Description Row - Hidden but functional for backend */}
                  <div className="hidden">
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
                              className="bg-popover border-border text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                          <FormLabel>
                            {isKraftReelGroup(currentGroupName || '') ? 'B.S.' : `Grain (${dimensionUnit})`} <span className="text-red-500">*</span>
                            {grainInputValue && !isKraftReelGroup(currentGroupName || '') && (
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
              <Card>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    <FormField
                      control={form.control}
                      name="stockAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">
                            Stock Age (days)
                            <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter stock age in days (e.g., 30)"
                              {...field}
                              data-testid="input-stock-age"
                              className="bg-popover border-border text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                </>
              )}

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
                      type="submit"
                      disabled={updateDealMutation.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      data-testid="button-save"
                    >
                      {updateDealMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Update Offer
                        </>
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