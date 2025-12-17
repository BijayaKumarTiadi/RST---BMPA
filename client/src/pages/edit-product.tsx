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
import { Package, Hash, Save, Calculator, IndianRupee, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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

// Helper function to check if group is Paper
const isPaperGroup = (groupName: string): boolean => {
  return groupName?.toLowerCase().trim() === 'paper';
};

// Helper function to check if group is Board
const isBoardGroup = (groupName: string): boolean => {
  return groupName?.toLowerCase().trim() === 'board';
};

// Helper function to check if group is Paper Reel
const isPaperReelGroup = (groupName: string): boolean => {
  return groupName?.toLowerCase().trim() === 'paper reel';
};

// Helper function to check if group uses material hierarchy
const isMaterialHierarchyGroup = (groupName: string): boolean => {
  return isPaperGroup(groupName) || isBoardGroup(groupName) || isPaperReelGroup(groupName) || isKraftReelGroup(groupName);
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
  gradeOfMaterial: z.string().optional(),
  GSM: z.coerce.number().optional(),
  Deckle_mm: z.coerce.number().optional(),
  grain_mm: z.coerce.number().optional(),
  // Spare part specific fields (new cascading structure)
  spareProcess: z.string().optional(),
  spareCategoryType: z.string().optional(),
  spareMachineType: z.string().optional(),
  spareManufacturer: z.string().optional(),
  spareModel: z.string().optional(),
  sparePartName: z.string().optional(),
  sparePartNo: z.string().optional(),
  // Common fields
  deal_description: z.string().optional(),
  OfferUnit: z.string().min(1, "Unit is required"),
  quantity: z.coerce.number().min(1, "Quantity is required").max(999999, "Quantity cannot exceed 999999"),
  stockAge: z.coerce.number().min(0, "Stock Age must be 0 or greater").max(999, "Stock Age cannot exceed 999 days").optional(),
  Seller_comments: z.string().max(400, "Comments cannot exceed 400 characters").optional(),
  // Offer rate fields
  offerRate: z.coerce.number().min(0, "Rate must be 0 or greater").optional(),
  showRateInMarketplace: z.boolean().default(true),
  // Packing fields
  packingType: z.string().optional(),
  sheetsPerPacket: z.string().optional(),
  // FSC Type
  fscType: z.string().optional().default('None'),
}).superRefine((data, ctx) => {
  const isKraftReel = isKraftReelGroup(data.groupName || '');
  const isSparePart = isSparePartGroup(data.groupName || '');

  if (isSparePart) {
    // Spare part validations (new cascading structure)
    if (!data.spareProcess || data.spareProcess.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Process is required",
        path: ["spareProcess"]
      });
    }
    if (!data.spareCategoryType || data.spareCategoryType.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Category Type is required",
        path: ["spareCategoryType"]
      });
    }
    if (!data.spareMachineType || data.spareMachineType.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Machine Type is required",
        path: ["spareMachineType"]
      });
    }
    if (!data.spareManufacturer || data.spareManufacturer.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Manufacturer is required",
        path: ["spareManufacturer"]
      });
    }
    if (!data.sparePartName || data.sparePartName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Part Name is required",
        path: ["sparePartName"]
      });
    }
    if (!data.sparePartNo || data.sparePartNo.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Part Number is required",
        path: ["sparePartNo"]
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

    // Validate GSM ranges for Paper and Board categories
    const isPaper = isPaperGroup(data.groupName || '');
    const isBoard = isBoardGroup(data.groupName || '');

    if (isPaper && data.GSM && data.GSM >= 180) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paper category requires GSM below 180. For 180 GSM and above, please select 'Board' category",
        path: ["GSM"]
      });
    }

    if (isBoard && data.GSM && data.GSM <= 175) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Board category requires GSM of 180 or above. For GSM up to 175, please select 'Paper' category",
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
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Spare part category states
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedCategoryType, setSelectedCategoryType] = useState("");
  const [selectedMachineType, setSelectedMachineType] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  // Material hierarchy states (for Paper/Board)
  const [selectedGradeOfMaterial, setSelectedGradeOfMaterial] = useState("");
  const [selectedMaterialKind, setSelectedMaterialKind] = useState("");
  const [selectedMaterialManufacturer, setSelectedMaterialManufacturer] = useState("");
  const [selectedMaterialBrand, setSelectedMaterialBrand] = useState("");


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

  // Calculate weight in kg based on dimensions and GSM
  const calculateWeightInKg = () => {
    const formValues = form.getValues();
    const quantity = formValues.quantity;
    const deckle_mm = formValues.Deckle_mm;
    const grain_mm = formValues.grain_mm;
    const gsm = formValues.GSM;

    if (quantity && deckle_mm && grain_mm && gsm) {
      const deckle_cm = deckle_mm / 10;
      const grain_cm = grain_mm / 10;
      const totalKg = (gsm * deckle_cm * grain_cm * quantity) / 10000000;
      const rounded = Math.floor(totalKg * 10) / 10;
      const secondDecimal = Math.floor((totalKg * 100) % 10);

      if (secondDecimal >= 6) {
        return (Math.ceil(totalKg * 10) / 10).toFixed(1);
      } else {
        return rounded.toFixed(1);
      }
    }
    return null;
  };

  // Handle unit change for dimensions
  const handleUnitChange = (newUnit: string) => {
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
      spareProcess: "",
      spareCategoryType: "",
      spareMachineType: "",
      spareManufacturer: "",
      spareModel: "",
      sparePartName: "",
      sparePartNo: "",
      OfferUnit: "",
      quantity: "" as any,
      stockAge: "" as any,
      Seller_comments: "",
      offerRate: "" as any,
      showRateInMarketplace: true,
      packingType: "",
      sheetsPerPacket: "",
      fscType: "None",
    },
    mode: "onChange",
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

  // Fetch existing deal data
  const { data: dealData, isLoading: isDealLoading } = useQuery({
    queryKey: ['/api/deals', dealId],
    queryFn: async () => {
      const response = await fetch(`/api/deals/${dealId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch deal');
      return response.json();
    },
    enabled: !!dealId,
  });

  // Watch form values for craft detection and Kraft Reel logic
  const currentMakeText = form.watch("makeText");
  const currentGradeText = form.watch("gradeText");
  const currentGroupName = form.watch("groupName");

  // Set dimension unit from user settings only on initial load
  useEffect(() => {
    if (userSettings?.dimension_unit && !isDataLoaded) {
      setDimensionUnit(userSettings.dimension_unit);
    }
  }, [userSettings, isDataLoaded]);

  // Pre-fill form with existing deal data
  useEffect(() => {
    if (dealData && !isDataLoaded) {
      const deal = dealData;
      
      // Get dimension unit (use user settings or default to cm)
      const unit = userSettings?.dimension_unit || "cm";
      setDimensionUnit(unit);
      
      // Set group
      const groupId = deal.group_id?.toString() || "";
      setSelectedGroup(groupId);
      setSelectedGroupName(deal.GroupName || "");
      
      // Set make/grade/brand text values
      const makeVal = deal.make_text || deal.Make || "";
      const gradeVal = deal.grade_text || deal.Grade || "";
      const brandVal = deal.brand_text || deal.Brand || "";
      setMakeText(makeVal);
      setGradeText(gradeVal);
      setBrandText(brandVal);
      
      // Set dimension input values with correct unit
      if (deal.Deckle_mm) {
        const deckleValue = convertFromMm(deal.Deckle_mm, unit);
        setDeckleInputValue(deckleValue.toFixed(2));
      }
      if (deal.grain_mm) {
        const grainValue = convertFromMm(deal.grain_mm, unit);
        setGrainInputValue(grainValue.toFixed(2));
      }

      // Set spare part fields if applicable
      if (deal.spare_process) setSelectedProcess(deal.spare_process);
      if (deal.spare_category_type) setSelectedCategoryType(deal.spare_category_type);
      if (deal.spare_machine_type) setSelectedMachineType(deal.spare_machine_type);
      if (deal.spare_manufacturer) setSelectedManufacturer(deal.spare_manufacturer);
      if (deal.spare_model) setSelectedModel(deal.spare_model);

      // Set material hierarchy fields - set all cascade levels
      if (deal.grade_of_material) setSelectedGradeOfMaterial(deal.grade_of_material);
      // For material hierarchy, the makeText is the material_kind, gradeText is manufacturer, brandText is brand
      if (makeVal) setSelectedMaterialKind(makeVal);
      if (gradeVal) setSelectedMaterialManufacturer(gradeVal);
      if (brandVal) setSelectedMaterialBrand(brandVal);

      // Reset form with deal values
      form.reset({
        groupID: groupId,
        groupName: deal.GroupName || "",
        MakeID: deal.make_id?.toString() || "",
        GradeID: deal.grade_id?.toString() || "",
        BrandID: deal.brand_id?.toString() || "",
        makeText: deal.make_text || deal.Make || "",
        gradeText: deal.grade_text || deal.Grade || "",
        brandText: deal.brand_text || deal.Brand || "",
        gradeOfMaterial: deal.grade_of_material || "",
        GSM: deal.GSM || ("" as any),
        Deckle_mm: deal.Deckle_mm || ("" as any),
        grain_mm: deal.grain_mm || ("" as any),
        spareProcess: deal.spare_process || "",
        spareCategoryType: deal.spare_category_type || "",
        spareMachineType: deal.spare_machine_type || "",
        spareManufacturer: deal.spare_manufacturer || "",
        spareModel: deal.spare_model || "",
        sparePartName: deal.spare_part_name || "",
        sparePartNo: deal.spare_part_no || "",
        OfferUnit: deal.unit || deal.OfferUnit || "",
        quantity: deal.quantity || ("" as any),
        stockAge: deal.StockAge || ("" as any),
        Seller_comments: deal.Seller_comments || "",
        offerRate: deal.price || deal.offerRate || ("" as any),
        showRateInMarketplace: deal.show_rate_in_marketplace === 1 || deal.show_rate_in_marketplace === true,
        packingType: deal.packing_type || "",
        sheetsPerPacket: deal.sheets_per_packet || "",
        fscType: deal.fsc_type || "None",
      });

      setIsDataLoaded(true);
    }
  }, [dealData, userSettings, form, isDataLoaded]);

  // Handle craft reel/craft paper B.S. auto-grade setting
  useEffect(() => {
    if (!isDataLoaded) return;
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
  }, [currentMakeText, currentGradeText, isGradeAutoSet, currentGroupName, form, isDataLoaded]);

  // Handle Kraft Reel Group auto-grade setting
  useEffect(() => {
    if (!isDataLoaded) return;
    if (currentGroupName && isKraftReelGroup(currentGroupName || '')) {
      if (isKraftReelAutoSet) {
        setIsKraftReelAutoSet(false);
      }
      setIsGradeAutoSet(false);
    }
  }, [currentGroupName, isKraftReelAutoSet, isDataLoaded]);

  // Handle Kraft Reel Group specific auto-settings
  useEffect(() => {
    if (!isDataLoaded) return;
    if (currentGroupName && isKraftReelGroup(currentGroupName || '')) {
      form.setValue("OfferUnit", "Kg");
    }
  }, [currentGroupName, form, isDataLoaded]);


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

  // Fetch FSC Types
  const { data: fscTypesData } = useQuery({
    queryKey: ["/api/fsc-types"],
    queryFn: async () => {
      const response = await fetch('/api/fsc-types');
      if (!response.ok) throw new Error('Failed to fetch FSC types');
      return response.json();
    },
  });

  const fscTypes = fscTypesData?.data || [];

  // Fetch spare part processes
  const { data: processes, isLoading: processesLoading } = useQuery({
    queryKey: ['/api/spare-parts/processes'],
    queryFn: async () => {
      const response = await fetch('/api/spare-parts/processes');
      if (!response.ok) throw new Error('Failed to fetch processes');
      return response.json();
    },
    enabled: isSparePartGroup(currentGroupName || ''),
  });

  // Fetch category types
  const { data: categoryTypes, isLoading: categoryTypesLoading } = useQuery({
    queryKey: ['/api/spare-parts/category-types'],
    queryFn: async () => {
      const response = await fetch(`/api/spare-parts/category-types`);
      if (!response.ok) throw new Error('Failed to fetch category types');
      return response.json();
    },
    enabled: isSparePartGroup(currentGroupName || ''),
  });

  // Fetch machine types
  const { data: machineTypes, isLoading: machineTypesLoading } = useQuery({
    queryKey: ['/api/spare-parts/machine-types', selectedProcess],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProcess) params.append('process', selectedProcess);
      const url = `/api/spare-parts/machine-types${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch machine types');
      return response.json();
    },
    enabled: isSparePartGroup(currentGroupName || '') && !!selectedProcess,
  });

  // Fetch manufacturers
  const { data: manufacturers, isLoading: manufacturersLoading } = useQuery({
    queryKey: ['/api/spare-parts/manufacturers', selectedProcess, selectedMachineType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProcess) params.append('process', selectedProcess);
      if (selectedMachineType) params.append('machineType', selectedMachineType);
      const url = `/api/spare-parts/manufacturers${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch manufacturers');
      return response.json();
    },
    enabled: isSparePartGroup(currentGroupName || '') && !!selectedProcess && !!selectedMachineType,
  });

  // Material Hierarchy Queries (for Paper/Board products)
  const { data: gradesOfMaterial } = useQuery({
    queryKey: ['/api/material-hierarchy/grades'],
    queryFn: async () => {
      const response = await fetch('/api/material-hierarchy/grades');
      if (!response.ok) throw new Error('Failed to fetch grades');
      return response.json();
    },
    enabled: isMaterialHierarchyGroup(currentGroupName || ''),
  });

  const { data: materialKinds } = useQuery({
    queryKey: ['/api/material-hierarchy/material-kinds', selectedGradeOfMaterial],
    queryFn: async () => {
      const url = selectedGradeOfMaterial
        ? `/api/material-hierarchy/material-kinds?gradeOfMaterial=${encodeURIComponent(selectedGradeOfMaterial)}`
        : '/api/material-hierarchy/material-kinds';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch material kinds');
      return response.json();
    },
    enabled: isMaterialHierarchyGroup(currentGroupName || '') && !!selectedGradeOfMaterial,
  });

  const { data: materialManufacturers } = useQuery({
    queryKey: ['/api/material-hierarchy/manufacturers', selectedGradeOfMaterial, selectedMaterialKind],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedGradeOfMaterial) params.append('gradeOfMaterial', selectedGradeOfMaterial);
      if (selectedMaterialKind) params.append('materialKind', selectedMaterialKind);
      const response = await fetch(`/api/material-hierarchy/manufacturers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch manufacturers');
      return response.json();
    },
    enabled: isMaterialHierarchyGroup(currentGroupName || '') && !!selectedMaterialKind,
  });

  const { data: materialBrands } = useQuery({
    queryKey: ['/api/material-hierarchy/brands', selectedGradeOfMaterial, selectedMaterialKind, selectedMaterialManufacturer],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedGradeOfMaterial) params.append('gradeOfMaterial', selectedGradeOfMaterial);
      if (selectedMaterialKind) params.append('materialKind', selectedMaterialKind);
      if (selectedMaterialManufacturer) params.append('manufacturer', selectedMaterialManufacturer);
      const response = await fetch(`/api/material-hierarchy/brands?${params}`);
      if (!response.ok) throw new Error('Failed to fetch brands');
      return response.json();
    },
    enabled: isMaterialHierarchyGroup(currentGroupName || '') && !!selectedMaterialManufacturer,
  });

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

  const generateNormalizationKey = () => {
    const description = generateStockDescription();
    return description.toLowerCase().replace(/[\s.]/g, '');
  };

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

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      const isSparePart = isSparePartGroup(data.groupName || '');

      if (isSparePart) {
        const partFullName = [
          data.spareProcess,
          data.spareCategoryType,
          data.spareMachineType,
          data.spareManufacturer,
          data.spareModel,
          data.sparePartName,
          data.sparePartNo
        ].filter(Boolean).join(' - ');

        const spareDescription = `${data.sparePartName} (${data.sparePartNo})`;
        const searchKey = partFullName.toLowerCase().replace(/[\s.]/g, '');

        const payload = {
          group_id: data.groupID ? parseInt(data.groupID) : 0,
          is_spare_part: true,
          spare_process: data.spareProcess,
          spare_category_type: data.spareCategoryType,
          spare_machine_type: data.spareMachineType,
          spare_manufacturer: data.spareManufacturer,
          spare_model: data.spareModel || '',
          spare_part_name: data.sparePartName,
          spare_part_no: data.sparePartNo,
          deal_title: spareDescription,
          stock_description: partFullName,
          search_key: searchKey,
          deal_description: data.Seller_comments || partFullName,
          price: data.offerRate || 0,
          quantity: data.quantity,
          unit: data.OfferUnit,
          StockAge: data.stockAge || 0,
          location: 'India',
          show_rate_in_marketplace: data.showRateInMarketplace ?? true,
          packing_type: data.packingType || null,
          sheets_per_packet: data.sheetsPerPacket || null,
          fsc_type: data.fscType || 'None',
        };

        return apiRequest("PATCH", `/api/deals/${dealId}`, payload);
      } else {
        const stockDescription = generateStockDescription();
        const searchKey = generateNormalizationKey();

        const payload = {
          group_id: data.groupID ? parseInt(data.groupID) : 0,
          make_text: data.makeText || makeText || "",
          grade_text: data.gradeText || gradeText || "",
          brand_text: data.brandText || brandText || "",
          make_id: data.MakeID || data.makeText || makeText || "",
          grade_id: data.GradeID || data.gradeText || gradeText || "",
          brand_id: data.BrandID || data.brandText || brandText || "",
          grade_of_material: data.gradeOfMaterial || selectedGradeOfMaterial || "",
          deal_title: `${data.brandText || 'Stock'} - ${data.GSM}GSM`,
          stock_description: stockDescription,
          search_key: searchKey,
          deal_description: data.Seller_comments || `${data.Deckle_mm}x${data.grain_mm}mm, ${data.GSM}GSM`,
          price: data.offerRate || 0,
          quantity: data.quantity,
          unit: data.OfferUnit,
          min_order_quantity: 100,
          StockAge: data.stockAge || 0,
          deal_specifications: {
            GSM: data.GSM,
            Deckle_mm: data.Deckle_mm,
            grain_mm: data.grain_mm,
          },
          location: 'India',
          show_rate_in_marketplace: data.showRateInMarketplace ?? true,
          packing_type: data.packingType || null,
          sheets_per_packet: data.sheetsPerPacket || null,
          fsc_type: data.fscType || 'None',
        };

        return apiRequest("PATCH", `/api/deals/${dealId}`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId] });
      queryClient.invalidateQueries({ queryKey: ["/api/seller/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/hierarchy"] });

      toast({
        title: "Success",
        description: "Offer updated successfully!",
      });
      setLocation("/seller-dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update offer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DealFormData) => {
    updateDealMutation.mutate(data);
  };

  if (isDealLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading offer data...</span>
          </div>
        </main>
      </div>
    );
  }

  const isSparePart = isSparePartGroup(currentGroupName || '');
  const isKraftReel = isKraftReelGroup(currentGroupName || '');
  const showMaterialHierarchy = isMaterialHierarchyGroup(currentGroupName || '');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-border shadow-lg bg-card">
            <CardHeader className="bg-muted border-b-2 border-border">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Edit Offer
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Update the details of your stock offer
                  </CardDescription>
                </div>
                <Link href="/seller-dashboard">
                  <Button variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Product Group Selection */}
                  <FormField
                    control={form.control}
                    name="groupID"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Product Category *
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            const selectedItem = groups.find((g: any) => String(g.GroupID) === value);
                            handleGroupChange(value, selectedItem);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-group">
                              <SelectValue placeholder="Select product category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {groups.map((group: any) => (
                              <SelectItem key={group.GroupID} value={String(group.GroupID)}>
                                {group.GroupName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Spare Part Form */}
                  {isSparePart && (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-semibold text-foreground">Spare Part Details</h3>
                      
                      {/* Process */}
                      <FormField
                        control={form.control}
                        name="spareProcess"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Process *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedProcess(value);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-process">
                                  <SelectValue placeholder="Select process" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(processes?.data || []).map((p: any) => (
                                  <SelectItem key={p.process} value={p.process}>
                                    {p.process}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Category Type */}
                      <FormField
                        control={form.control}
                        name="spareCategoryType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category Type *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedCategoryType(value);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-category-type">
                                  <SelectValue placeholder="Select category type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(categoryTypes?.data || []).map((c: any) => (
                                  <SelectItem key={c.category_type} value={c.category_type}>
                                    {c.category_type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Machine Type */}
                      <FormField
                        control={form.control}
                        name="spareMachineType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Machine Type *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedMachineType(value);
                              }}
                              disabled={!selectedProcess}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-machine-type">
                                  <SelectValue placeholder="Select machine type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(machineTypes?.data || []).map((m: any) => (
                                  <SelectItem key={m.machine_type} value={m.machine_type}>
                                    {m.machine_type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Manufacturer */}
                      <FormField
                        control={form.control}
                        name="spareManufacturer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Manufacturer *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedManufacturer(value);
                              }}
                              disabled={!selectedMachineType}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-manufacturer">
                                  <SelectValue placeholder="Select manufacturer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(manufacturers?.data || []).map((m: any) => (
                                  <SelectItem key={m.manufacturer} value={m.manufacturer}>
                                    {m.manufacturer}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Model (Optional) */}
                      <FormField
                        control={form.control}
                        name="spareModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter model (optional)" data-testid="input-model" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Part Name */}
                      <FormField
                        control={form.control}
                        name="sparePartName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Part Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter part name" data-testid="input-part-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Part Number */}
                      <FormField
                        control={form.control}
                        name="sparePartNo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Part Number *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter part number" data-testid="input-part-no" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Regular Product Form */}
                  {!isSparePart && selectedGroup && (
                    <div className="space-y-4">
                      {/* Material Hierarchy Dropdowns */}
                      {showMaterialHierarchy && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                          <h3 className="font-semibold text-foreground">Material Details</h3>
                          
                          {/* Grade of Material */}
                          <FormField
                            control={form.control}
                            name="gradeOfMaterial"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Grade of Material *</FormLabel>
                                <Select
                                  value={field.value || selectedGradeOfMaterial}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedGradeOfMaterial(value);
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-grade-of-material">
                                      <SelectValue placeholder="Select grade of material" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {(gradesOfMaterial?.data || []).map((g: any) => (
                                      <SelectItem key={g.grade_of_material} value={g.grade_of_material}>
                                        {g.grade_of_material}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Material Kind (Make) */}
                          {selectedGradeOfMaterial && (
                            <FormItem>
                              <FormLabel>Material Kind (Make) *</FormLabel>
                              <Select
                                value={selectedMaterialKind}
                                onValueChange={(value) => {
                                  setSelectedMaterialKind(value);
                                  form.setValue("makeText", value);
                                  setMakeText(value);
                                }}
                              >
                                <SelectTrigger data-testid="select-material-kind">
                                  <SelectValue placeholder="Select material kind" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(materialKinds?.data || []).map((k: any) => (
                                    <SelectItem key={k.material_kind} value={k.material_kind}>
                                      {k.material_kind}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}

                          {/* Manufacturer (Grade) */}
                          {selectedMaterialKind && (
                            <FormItem>
                              <FormLabel>Manufacturer (Grade) *</FormLabel>
                              <Select
                                value={selectedMaterialManufacturer}
                                onValueChange={(value) => {
                                  setSelectedMaterialManufacturer(value);
                                  form.setValue("gradeText", value);
                                  setGradeText(value);
                                }}
                              >
                                <SelectTrigger data-testid="select-manufacturer">
                                  <SelectValue placeholder="Select manufacturer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(materialManufacturers?.data || []).map((m: any) => (
                                    <SelectItem key={m.manufacturer} value={m.manufacturer}>
                                      {m.manufacturer}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}

                          {/* Brand */}
                          {selectedMaterialManufacturer && !isKraftReel && (
                            <FormItem>
                              <FormLabel>Brand *</FormLabel>
                              <Select
                                value={selectedMaterialBrand}
                                onValueChange={(value) => {
                                  setSelectedMaterialBrand(value);
                                  form.setValue("brandText", value);
                                  setBrandText(value);
                                }}
                              >
                                <SelectTrigger data-testid="select-brand">
                                  <SelectValue placeholder="Select brand" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(materialBrands?.data || []).map((b: any) => (
                                    <SelectItem key={b.brand} value={b.brand}>
                                      {b.brand}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        </div>
                      )}

                      {/* Fallback Autocomplete for non-hierarchy groups */}
                      {!showMaterialHierarchy && (
                        <>
                          <FormField
                            control={form.control}
                            name="makeText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Make *</FormLabel>
                                <FormControl>
                                  <AutocompleteInput
                                    suggestions={filteredMakes}
                                    displayField="make_Name"
                                    valueField="make_ID"
                                    value={makeText}
                                    onChange={(value: string) => {
                                      form.setValue("MakeID", value);
                                      const selectedMakeItem = filteredMakes.find((m: any) => String(m.make_ID) === value);
                                      if (selectedMakeItem) {
                                        form.setValue("makeText", selectedMakeItem.make_Name);
                                        setMakeText(selectedMakeItem.make_Name);
                                      } else {
                                        form.setValue("makeText", value);
                                        setMakeText(value);
                                      }
                                    }}
                                    placeholder="Type or select make"
                                    testId="input-make"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="gradeText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Grade *</FormLabel>
                                <FormControl>
                                  <AutocompleteInput
                                    suggestions={filteredGrades}
                                    displayField="GradeName"
                                    valueField="GradeID"
                                    value={gradeText}
                                    onChange={(value: string) => {
                                      const selectedGradeItem = filteredGrades.find((g: any) => String(g.GradeID) === value);
                                      if (selectedGradeItem) {
                                        form.setValue("GradeID", value);
                                        form.setValue("gradeText", selectedGradeItem.GradeName);
                                        setGradeText(selectedGradeItem.GradeName);
                                      } else {
                                        form.setValue("GradeID", "");
                                        form.setValue("gradeText", value);
                                        setGradeText(value);
                                      }
                                    }}
                                    placeholder="Type or select grade"
                                    testId="input-grade"
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
                                <FormLabel>Brand *</FormLabel>
                                <FormControl>
                                  <AutocompleteInput
                                    suggestions={filteredBrands}
                                    displayField="brandname"
                                    valueField="brandid"
                                    value={brandText}
                                    onChange={(value: string) => {
                                      const selectedBrandItem = filteredBrands.find((b: any) => String(b.brandid) === value);
                                      if (selectedBrandItem) {
                                        form.setValue("BrandID", value);
                                        form.setValue("brandText", selectedBrandItem.brandname);
                                        setBrandText(selectedBrandItem.brandname);
                                      } else {
                                        form.setValue("BrandID", "");
                                        form.setValue("brandText", value);
                                        setBrandText(value);
                                      }
                                    }}
                                    placeholder="Type or select brand"
                                    testId="input-brand"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      {/* GSM */}
                      <FormField
                        control={form.control}
                        name="GSM"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GSM *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                placeholder="Enter GSM"
                                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                data-testid="input-gsm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Dimensions */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">Dimension Unit:</span>
                          <Select value={dimensionUnit} onValueChange={handleUnitChange}>
                            <SelectTrigger className="w-24" data-testid="select-dimension-unit">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cm">cm</SelectItem>
                              <SelectItem value="inch">inch</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="Deckle_mm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Deckle ({dimensionUnit}) *</FormLabel>
                                <FormControl>
                                  <div className="space-y-1">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={deckleInputValue}
                                      onChange={(e) => handleDeckleChange(e.target.value)}
                                      placeholder={`Enter deckle in ${dimensionUnit}`}
                                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      data-testid="input-deckle"
                                    />
                                    {getDeckleDimensions() && (
                                      <p className="text-xs text-muted-foreground">{getDeckleDimensions()}</p>
                                    )}
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
                                <FormLabel>Grain ({dimensionUnit}) *</FormLabel>
                                <FormControl>
                                  <div className="space-y-1">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={grainInputValue}
                                      onChange={(e) => handleGrainChange(e.target.value)}
                                      placeholder={`Enter grain in ${dimensionUnit}`}
                                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      data-testid="input-grain"
                                    />
                                    {getGrainDimensions() && (
                                      <p className="text-xs text-muted-foreground">{getGrainDimensions()}</p>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Common Fields */}
                  {selectedGroup && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="font-semibold text-foreground">Quantity & Pricing</h3>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  placeholder="Enter quantity"
                                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  data-testid="input-quantity"
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
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-unit">
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Kg">Kg</SelectItem>
                                  <SelectItem value="Sheets">Sheets</SelectItem>
                                  <SelectItem value="Pcs">Pcs</SelectItem>
                                  <SelectItem value="Reams">Reams</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Weight Calculator */}
                      {!isSparePart && calculateWeightInKg() && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Calculator className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            Estimated Weight: <strong>{calculateWeightInKg()} Kg</strong>
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="stockAge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock Age (days)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  placeholder="Enter stock age"
                                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  data-testid="input-stock-age"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="offerRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-1">
                                <IndianRupee className="h-3 w-3" />
                                Rate per Unit
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  placeholder="Enter rate"
                                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  data-testid="input-rate"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Show Rate in Marketplace */}
                      <FormField
                        control={form.control}
                        name="showRateInMarketplace"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-show-rate"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              Show rate in marketplace
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      {/* Packing Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="packingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Packing Type</FormLabel>
                              <Select value={field.value || ""} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-packing-type">
                                    <SelectValue placeholder="Select packing type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Loose">Loose</SelectItem>
                                  <SelectItem value="Pallet">Pallet</SelectItem>
                                  <SelectItem value="Packet">Packet</SelectItem>
                                  <SelectItem value="Reel">Reel</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sheetsPerPacket"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sheets per Packet</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., 100, 250, 500" data-testid="input-sheets-per-packet" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* FSC Type */}
                      <FormField
                        control={form.control}
                        name="fscType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>FSC Certification</FormLabel>
                            <Select value={field.value || "None"} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-fsc-type">
                                  <SelectValue placeholder="Select FSC type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="None">None</SelectItem>
                                {fscTypes.map((fsc: any) => (
                                  <SelectItem key={fsc.fsc_type} value={fsc.fsc_type}>
                                    {fsc.fsc_type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Comments */}
                      <FormField
                        control={form.control}
                        name="Seller_comments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comments (max 400 characters)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Add any additional notes or comments"
                                className="resize-none"
                                rows={3}
                                data-testid="textarea-comments"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  {selectedGroup && (
                    <div className="flex justify-end gap-4 pt-4 border-t">
                      <Link href="/seller-dashboard">
                        <Button type="button" variant="outline" data-testid="button-cancel-bottom">
                          Cancel
                        </Button>
                      </Link>
                      <Button
                        type="submit"
                        disabled={updateDealMutation.isPending}
                        data-testid="button-update-offer"
                      >
                        {updateDealMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
