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
import { Package, Hash, Plus, Calculator, IndianRupee, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useLocation } from "wouter";
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
  gradeOfMaterial: z.string().optional(), // Grade of Material for Paper/Board
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

export default function AddDeal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedGroupName, setSelectedGroupName] = useState(""); // Track group name for Kraft Reel logic
  const [selectedMake, setSelectedMake] = useState("");
  const [makeText, setMakeText] = useState("");
  const [gradeText, setGradeText] = useState("");
  const [brandText, setBrandText] = useState("");
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [isGradeAutoSet, setIsGradeAutoSet] = useState(false);
  const [isKraftReelAutoSet, setIsKraftReelAutoSet] = useState(false);

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

  // Bulk upload state
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
  const [bulkUploadSuccess, setBulkUploadSuccess] = useState<string>("");
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

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
      // Convert mm to cm first
      const deckle_cm = deckle_mm / 10;
      const grain_cm = grain_mm / 10;

      // Formula: (GSM × Deckle_cm × Grain_cm × Quantity) / 10,000,000
      const totalKg = (gsm * deckle_cm * grain_cm * quantity) / 10000000;

      // Custom rounding logic:
      // If second decimal >= 6, round first decimal up
      // Otherwise, truncate to 1 decimal
      const rounded = Math.floor(totalKg * 10) / 10; // Get first decimal
      const secondDecimal = Math.floor((totalKg * 100) % 10); // Get second decimal digit

      if (secondDecimal >= 6) {
        // Round up the first decimal
        return (Math.ceil(totalKg * 10) / 10).toFixed(1);
      } else {
        // Keep first decimal as is
        return rounded.toFixed(1);
      }
    }
    return null;
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

  // Watch form values for craft detection and Kraft Reel logic
  const currentMakeText = form.watch("makeText");
  const currentGradeText = form.watch("gradeText");
  const currentGroupName = form.watch("groupName");

  // Set dimension unit from user settings only on initial load
  useEffect(() => {
    if (userSettings?.dimension_unit && !dimensionUnit) {
      setDimensionUnit(userSettings.dimension_unit);
    }
  }, [userSettings]);

  // Set initial dimension unit from settings on component mount
  useEffect(() => {
    if (userSettings?.dimension_unit && dimensionUnit === "cm") {
      setDimensionUnit(userSettings.dimension_unit);
    }
  }, [userSettings]);

  // Handle craft reel/craft paper B.S. auto-grade setting
  useEffect(() => {
    // Don't run craft logic if Kraft Reel group is selected
    if (currentMakeText && isCraftMake(currentMakeText) && !isKraftReelGroup(currentGroupName || '')) {
      // Auto-set Grade to "Craft Paper" if empty or previously auto-set
      if (!currentGradeText || isGradeAutoSet || currentGradeText === "Craft Paper") {
        form.setValue("gradeText", "Craft Paper");
        form.setValue("GradeID", "");
        setGradeText("Craft Paper");
        setIsGradeAutoSet(true);
      }
    } else if (isGradeAutoSet && currentGradeText === "Craft Paper") {
      // Clear auto-set grade when not craft type anymore
      form.setValue("gradeText", "");
      form.setValue("GradeID", "");
      setGradeText("");
      setIsGradeAutoSet(false);
    }
  }, [currentMakeText, currentGradeText, isGradeAutoSet, currentGroupName, form]);

  // Handle Kraft Reel Group auto-grade setting
  // Note: Kraft Reel now uses material hierarchy dropdowns, so no auto-grade setting needed
  // The Manufacturer dropdown sets gradeText for Kraft Reel
  useEffect(() => {
    // Clear any previous auto-set values when switching to Kraft Reel
    // since it now uses material hierarchy
    if (currentGroupName && isKraftReelGroup(currentGroupName || '')) {
      if (isKraftReelAutoSet) {
        setIsKraftReelAutoSet(false);
      }
      setIsGradeAutoSet(false);
    }
  }, [currentGroupName, isKraftReelAutoSet]);

  // Handle Kraft Reel Group specific auto-settings
  useEffect(() => {
    if (currentGroupName && isKraftReelGroup(currentGroupName || '')) {
      // Auto-select Unit = "Kg" 
      form.setValue("OfferUnit", "Kg");
    }
  }, [currentGroupName, form]);


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

  // Fetch spare part processes
  const { data: processes, isLoading: processesLoading } = useQuery({
    queryKey: ['/api/spare-parts/processes'],
    queryFn: async () => {
      console.log('Fetching processes...');
      const response = await fetch('/api/spare-parts/processes');
      if (!response.ok) throw new Error('Failed to fetch processes');
      const data = await response.json();
      console.log('Processes data:', data);
      return data;
    },
    enabled: isSparePartGroup(currentGroupName || ''),
  });

  // Fetch category types - independent of process
  const { data: categoryTypes, isLoading: categoryTypesLoading } = useQuery({
    queryKey: ['/api/spare-parts/category-types'],
    queryFn: async () => {
      console.log('Fetching category types...');
      const response = await fetch(`/api/spare-parts/category-types`);
      if (!response.ok) throw new Error('Failed to fetch category types');
      const data = await response.json();
      console.log('Category types data:', data);
      return data;
    },
    enabled: isSparePartGroup(currentGroupName || ''),
  });

  // Fetch machine types - filtered by process only
  const { data: machineTypes, isLoading: machineTypesLoading } = useQuery({
    queryKey: ['/api/spare-parts/machine-types', selectedProcess],
    queryFn: async () => {
      console.log('Fetching machine types for process:', selectedProcess);
      const params = new URLSearchParams();
      if (selectedProcess) params.append('process', selectedProcess);

      const url = `/api/spare-parts/machine-types${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch machine types');
      const data = await response.json();
      console.log('Machine types data:', data);
      return data;
    },
    enabled: isSparePartGroup(currentGroupName || '') && !!selectedProcess,
  });

  // Clear machine type when process changes
  useEffect(() => {
    if (isSparePartGroup(currentGroupName || '')) {
      form.setValue('spareMachineType', '');
      setSelectedMachineType('');
    }
  }, [selectedProcess, currentGroupName, form]);

  // Fetch manufacturers - filtered by Process and Machine Type
  const { data: manufacturers, isLoading: manufacturersLoading } = useQuery({
    queryKey: ['/api/spare-parts/manufacturers', selectedProcess, selectedMachineType],
    queryFn: async () => {
      console.log('Fetching manufacturers for process:', selectedProcess, 'machineType:', selectedMachineType);
      const params = new URLSearchParams();
      if (selectedProcess) params.append('process', selectedProcess);
      if (selectedMachineType) params.append('machineType', selectedMachineType);

      const url = `/api/spare-parts/manufacturers${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch manufacturers');
      const data = await response.json();
      console.log('Manufacturers data:', data);
      return data;
    },
    enabled: isSparePartGroup(currentGroupName || '') && !!selectedProcess && !!selectedMachineType,
  });

  // Clear manufacturer when process or machine type changes
  useEffect(() => {
    if (isSparePartGroup(currentGroupName || '')) {
      form.setValue('spareManufacturer', '');
      setSelectedManufacturer('');
    }
  }, [selectedProcess, selectedMachineType, currentGroupName, form]);

  // Debug log when data changes
  useEffect(() => {
    if (isSparePartGroup(currentGroupName || '')) {
      console.log('=== Spare Part Data Debug ===');
      console.log('Processes:', processes, 'Loading:', processesLoading);
      console.log('Category Types:', categoryTypes, 'Loading:', categoryTypesLoading);
      console.log('Machine Types:', machineTypes, 'Loading:', machineTypesLoading);
      console.log('Manufacturers:', manufacturers, 'Loading:', manufacturersLoading);
    }
  }, [processes, categoryTypes, machineTypes, manufacturers, currentGroupName, processesLoading, categoryTypesLoading, machineTypesLoading, manufacturersLoading]);

  // Material Hierarchy Queries (for Paper/Board products)
  // Fetch Grades of Material
  const { data: gradesOfMaterial } = useQuery({
    queryKey: ['/api/material-hierarchy/grades'],
    queryFn: async () => {
      const response = await fetch('/api/material-hierarchy/grades');
      if (!response.ok) throw new Error('Failed to fetch grades');
      return response.json();
    },
    enabled: isMaterialHierarchyGroup(currentGroupName || ''),
  });

  // Fetch Material Kinds (filtered by Grade of Material)
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

  // Fetch Manufacturers (filtered by Grade and Material Kind)
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

  // Fetch Brands (filtered by all previous selections)
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

  // Clear dependent fields when Grade of Material changes
  useEffect(() => {
    if (isMaterialHierarchyGroup(currentGroupName || '')) {
      setSelectedMaterialKind("");
      setSelectedMaterialManufacturer("");
      setSelectedMaterialBrand("");
      form.setValue("makeText", "");
      form.setValue("gradeText", "");
      form.setValue("brandText", "");
    }
  }, [selectedGradeOfMaterial, currentGroupName, form]);

  // Clear dependent fields when Material Kind changes
  useEffect(() => {
    if (isMaterialHierarchyGroup(currentGroupName || '')) {
      setSelectedMaterialManufacturer("");
      setSelectedMaterialBrand("");
      form.setValue("gradeText", "");
      form.setValue("brandText", "");
    }
  }, [selectedMaterialKind, currentGroupName, form]);

  // Clear Brand when Manufacturer changes
  useEffect(() => {
    if (isMaterialHierarchyGroup(currentGroupName || '')) {
      setSelectedMaterialBrand("");
      form.setValue("brandText", "");
    }
  }, [selectedMaterialManufacturer, currentGroupName, form]);

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
      // For Kraft Reel, brand is optional, so generate description without it if not provided
      if (makeValue && gradeValue && gsmValue) {
        if (brandValue) {
          return `${makeValue} ${gradeValue} ${brandValue} ${gsmValue}gsm`;
        } else {
          // Generate without brand for Kraft Reel
          return `${makeValue} ${gradeValue} ${gsmValue}gsm`;
        }
      }
    } else {
      // For regular products, all fields are required
      if (makeValue && gradeValue && brandValue && gsmValue) {
        // Use spaces between components
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
  const handleGroupChange = (value: string, item?: any) => {
    setSelectedGroup(value);
    form.setValue("groupID", value);

    // Set group name for Kraft Reel logic
    const groupName = item?.GroupName || value;
    setSelectedGroupName(groupName);
    form.setValue("groupName", groupName);
  };

  const handleMakeChange = (value: string, item: any) => {
    if (item) {
      setSelectedMake(value);

      // Set form values properly for both dropdown and free text
      if (item.make_ID) {
        // This is a dropdown selection - convert ID to string
        form.setValue("MakeID", String(item.make_ID));
        form.setValue("makeText", item.make_Name || "");
        setMakeText(item.make_Name || "");
      } else {
        // This is free text input
        form.setValue("MakeID", "");
        form.setValue("makeText", value);
        setMakeText(value);
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
        // This is a selection from dropdown - convert ID to string
        form.setValue("GradeID", String(value));
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
        // This is a selection from dropdown - convert ID to string
        form.setValue("BrandID", String(value));
        form.setValue("brandText", item.brandname || "");
        setBrandText(item.brandname || "");
      }
    }
  };

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      const isSparePart = isSparePartGroup(data.groupName || '');

      if (isSparePart) {
        // Spare Part submission - using new cascading fields
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
        };

        console.log('✅ SPARE PART PAYLOAD:', JSON.stringify(payload, null, 2));
        console.log('✅ is_spare_part flag:', payload.is_spare_part);
        return apiRequest("POST", "/api/deals", payload);
      } else {
        // Regular product submission
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
        };

        console.log('Regular product payload being sent to backend:', payload);
        return apiRequest("POST", "/api/deals", payload);
      }
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
        });
        setSelectedGroup("");
        setSelectedGroupName("");
        setSelectedMake("");
        setMakeText("");
        setGradeText("");
        setBrandText("");
        setDeckleInputValue("");
        setGrainInputValue("");
        setIsGradeAutoSet(false);
        setIsKraftReelAutoSet(false);
        setSelectedProcess("");
        setSelectedCategoryType("");
        setSelectedMachineType("");
        setSelectedManufacturer("");
        setSelectedModel("");
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

  // Bulk upload functions
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/deals/export');
      if (!response.ok) {
        throw new Error('Failed to download offers');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my_offers.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Offers Downloaded",
        description: "You can edit these offers or add new ones and upload the file back.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Invalid File",
          description: "Please upload an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
        return;
      }
      setBulkUploadFile(file);
      setBulkUploadErrors([]);
      setBulkUploadSuccess("");
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      toast({
        title: "No File Selected",
        description: "Please select an Excel file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsBulkUploading(true);
    setBulkUploadErrors([]);
    setBulkUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append('file', bulkUploadFile);

      const response = await fetch('/api/deals/bulk-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && result.errors.length > 0) {
          setBulkUploadErrors(result.errors);
        } else {
          setBulkUploadErrors([result.message || 'Upload failed']);
        }
        return;
      }

      setBulkUploadSuccess(result.message || `Successfully processed ${result.created || 0} new and ${result.updated || 0} updated records`);
      setBulkUploadFile(null);
      // Reset file input
      const fileInput = document.getElementById('bulk-upload-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/my'] });
    } catch (error: any) {
      setBulkUploadErrors([error.message || 'Failed to upload file']);
    } finally {
      setIsBulkUploading(false);
    }
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
          <div className="mb-3">
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground mb-1">Add an Offer</h1>
            </div>
          </div>

          {/* Bulk Upload Section */}
          <Card className="bg-card border-border mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <FileSpreadsheet className="h-5 w-5" />
                  Bulk Upload
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkUpload(!showBulkUpload)}
                  data-testid="button-toggle-bulk-upload"
                >
                  {showBulkUpload ? 'Hide' : 'Show'} Bulk Upload
                </Button>
              </div>
              <CardDescription className="text-muted-foreground">
                Download your offers, make changes, or add new rows, then upload. (Supports Creating & Updating)
              </CardDescription>
            </CardHeader>
            {showBulkUpload && (
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2"
                    data-testid="button-download-template"
                  >
                    <Download className="h-4 w-4" />
                    Download My Offers (Excel)
                  </Button>

                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      id="bulk-upload-input"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="flex-1"
                      data-testid="input-bulk-upload-file"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleBulkUpload}
                    disabled={!bulkUploadFile || isBulkUploading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    data-testid="button-upload-bulk"
                  >
                    {isBulkUploading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>

                {bulkUploadFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected file: <span className="font-medium">{bulkUploadFile.name}</span>
                  </p>
                )}

                {bulkUploadErrors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Upload Errors</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                          {bulkUploadErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {bulkUploadSuccess && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-green-800 dark:text-green-200">{bulkUploadSuccess}</span>
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium">Instructions:</p>
                  <ol className="list-decimal list-inside space-y-0.5 ml-2">
                    <li>Download Excel file - it contains all your existing offers</li>
                    <li>Edit existing rows or add new rows (leave TransID blank for new offers)</li>
                    <li>Use dropdowns for: Board Type, Grade of Material, Material Kind, Manufacturer, Brand</li>
                    <li>Enter GSM, Size (Deckle x Grain in cm), Unit, and Quantity</li>
                    <li>Upload the file - rows WITH TransID will be updated, rows WITHOUT will be created</li>
                    <li>Maximum 200 rows per upload</li>
                  </ol>
                </div>
              </CardContent>
            )}
          </Card>

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
                              <Select
                                value={field.value}
                                onValueChange={(value) => {
                                  const selectedItem = groups.find((g: any) => String(g.GroupID) === value);
                                  console.log('Group selected:', value, selectedItem);
                                  handleGroupChange(value, selectedItem);
                                  console.log('After handleGroupChange - currentGroupName:', form.getValues('groupName'));
                                }}
                              >
                                <SelectTrigger className="bg-popover border-border text-foreground">
                                  <SelectValue placeholder="Select product group" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border" style={{ zIndex: 9999 }}>
                                  {groups?.map((group: any) => (
                                    <SelectItem key={group.GroupID} value={String(group.GroupID)} className="text-foreground hover:bg-accent">
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

                      {/* First Row: Process and Machine Type */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Controller
                          control={form.control}
                          name="spareProcess"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Process <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value || ""}
                                  onValueChange={(value) => {
                                    console.log('Process selected:', value);
                                    field.onChange(value);
                                    setSelectedProcess(value);
                                    // Clear manufacturer when process changes
                                    form.setValue('spareManufacturer', '');
                                    setSelectedManufacturer('');
                                  }}
                                >
                                  <SelectTrigger className="bg-popover border-border text-foreground">
                                    <SelectValue placeholder="Select process" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border-border" style={{ zIndex: 9999 }}>
                                    {processes?.map((process: string) => (
                                      <SelectItem key={process} value={process} className="text-foreground hover:bg-accent">
                                        {process}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              {fieldState.error && (
                                <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                              )}
                            </FormItem>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="spareMachineType"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Machine Type <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value || ""}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedMachineType(value);
                                  }}
                                  disabled={!selectedProcess}
                                >
                                  <SelectTrigger className="bg-popover border-border text-foreground">
                                    <SelectValue placeholder={!selectedProcess ? "Select process first" : "Select machine type"} />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border-border" style={{ zIndex: 9999 }}>
                                    {machineTypes?.map((type: string) => (
                                      <SelectItem key={type} value={type} className="text-foreground hover:bg-accent">
                                        {type}
                                      </SelectItem>
                                    ))}
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

                      {/* Second Row: Manufacturer and Category Type */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="spareManufacturer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Manufacturer <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedManufacturer(value);
                                  }}
                                  disabled={!selectedProcess || !selectedMachineType}
                                >
                                  <SelectTrigger className="bg-popover border-border text-foreground">
                                    <SelectValue placeholder={
                                      !selectedProcess
                                        ? "Select process first"
                                        : !selectedMachineType
                                          ? "Select machine type first"
                                          : "Select manufacturer"
                                    } />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border-border">
                                    {manufacturers?.map((mfr: string) => (
                                      <SelectItem key={mfr} value={mfr} className="text-foreground hover:bg-accent">
                                        {mfr}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Controller
                          control={form.control}
                          name="spareCategoryType"
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Category Type <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value || ""}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedCategoryType(value);
                                  }}
                                >
                                  <SelectTrigger className="bg-popover border-border text-foreground">
                                    <SelectValue placeholder="Select category type" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border-border">
                                    {categoryTypes?.map((type: string) => (
                                      <SelectItem key={type} value={type} className="text-foreground hover:bg-accent">
                                        {type}
                                      </SelectItem>
                                    ))}
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

                      {/* Third Row: Model (text input) */}
                      <FormField
                        control={form.control}
                        name="spareModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">
                              Model
                              <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Enter model..."
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  setSelectedModel(e.target.value);
                                }}
                                className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
                                maxLength={60}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Fourth Row: Part Name and Part Number */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="sparePartName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Part Name <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Enter part name"
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
                          name="sparePartNo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Part Number <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder="Enter part number"
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

                  {/* Inventory */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Package className="h-5 w-5" />
                        Inventory
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Set your available quantity and unit
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="Enter quantity"
                                  {...field}
                                  data-testid="input-quantity"
                                  maxLength={6}
                                  onBeforeInput={(e: any) => {
                                    const char = e.data;
                                    if (char && !/^[0-9]$/.test(char)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    field.onChange(value);
                                  }}
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
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="Enter stock age in days (e.g., 30)"
                                  {...field}
                                  data-testid="input-stock-age"
                                  maxLength={3}
                                  onBeforeInput={(e: any) => {
                                    const char = e.data;
                                    if (char && !/^[0-9]$/.test(char)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    field.onChange(value);
                                  }}
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
                                maxLength={400}
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
                                <Select
                                  value={field.value}
                                  onValueChange={(value) => {
                                    const selectedItem = groups.find((g: any) => String(g.GroupID) === value);
                                    console.log('Group selected:', value, selectedItem);
                                    handleGroupChange(value, selectedItem);
                                    console.log('After handleGroupChange - currentGroupName:', form.getValues('groupName'));
                                  }}
                                >
                                  <SelectTrigger className="bg-popover border-border text-foreground">
                                    <SelectValue placeholder="Select product group" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border-border">
                                    {groups.map((group: any) => (
                                      <SelectItem key={group.GroupID} value={String(group.GroupID)} className="text-foreground hover:bg-accent">
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

                        {/* Conditional Field: Grade of Material for Paper/Board, Product Make for others */}
                        {isMaterialHierarchyGroup(currentGroupName || '') ? (
                          <FormField
                            control={form.control}
                            name="gradeOfMaterial"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground">Grade of Material <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Select
                                    value={selectedGradeOfMaterial}
                                    onValueChange={(value) => {
                                      setSelectedGradeOfMaterial(value);
                                      form.setValue("gradeOfMaterial", value);
                                    }}
                                  >
                                    <SelectTrigger className="bg-popover border-border text-foreground">
                                      <SelectValue placeholder="Select grade of material" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border">
                                      {(gradesOfMaterial || []).map((grade: any) => (
                                        <SelectItem key={grade.grade_of_material} value={grade.grade_of_material} className="text-foreground hover:bg-accent">
                                          {grade.grade_of_material}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <FormField
                            control={form.control}
                            name="makeText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-foreground">Product Make <span className="text-red-500">*</span></FormLabel>
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
                                    maxLength={60}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      {/* Material Kind (Make), Manufacturer (Grade), Brand for Paper/Board */}
                      {isMaterialHierarchyGroup(currentGroupName || '') && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Material Kind (replaces Make) */}
                            <FormField
                              control={form.control}
                              name="makeText"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground">Material Kind <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Select
                                      value={selectedMaterialKind}
                                      onValueChange={(value) => {
                                        setSelectedMaterialKind(value);
                                        form.setValue("makeText", value);
                                        setMakeText(value);
                                      }}
                                      disabled={!selectedGradeOfMaterial}
                                    >
                                      <SelectTrigger className="bg-popover border-border text-foreground">
                                        <SelectValue placeholder={!selectedGradeOfMaterial ? "Select grade of material first" : "Select material kind"} />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover border-border">
                                        {(materialKinds || []).map((kind: any) => (
                                          <SelectItem key={kind.material_kind} value={kind.material_kind} className="text-foreground hover:bg-accent">
                                            {kind.material_kind}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Manufacturer (replaces Grade) */}
                            <FormField
                              control={form.control}
                              name="gradeText"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground">Manufacturer <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Select
                                      value={selectedMaterialManufacturer}
                                      onValueChange={(value) => {
                                        setSelectedMaterialManufacturer(value);
                                        form.setValue("gradeText", value);
                                        setGradeText(value);
                                      }}
                                      disabled={!selectedMaterialKind}
                                    >
                                      <SelectTrigger className="bg-popover border-border text-foreground">
                                        <SelectValue placeholder={!selectedMaterialKind ? "Select material kind first" : "Select manufacturer"} />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover border-border">
                                        {(materialManufacturers || []).map((mfr: any) => (
                                          <SelectItem key={mfr.manufacturer} value={mfr.manufacturer} className="text-foreground hover:bg-accent">
                                            {mfr.manufacturer}
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Brand Name */}
                            <FormField
                              control={form.control}
                              name="brandText"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-foreground">
                                    Brand Name {isKraftReelGroup(currentGroupName || '') ? "(Optional)" : <span className="text-red-500">*</span>}
                                  </FormLabel>
                                  <FormControl>
                                    <Select
                                      value={selectedMaterialBrand}
                                      onValueChange={(value) => {
                                        setSelectedMaterialBrand(value);
                                        form.setValue("brandText", value);
                                        setBrandText(value);
                                      }}
                                      disabled={!selectedMaterialManufacturer}
                                    >
                                      <SelectTrigger className="bg-popover border-border text-foreground">
                                        <SelectValue placeholder={!selectedMaterialManufacturer ? "Select manufacturer first" : "Select brand"} />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover border-border">
                                        {(materialBrands || []).map((brand: any) => (
                                          <SelectItem key={brand.brand_name} value={brand.brand_name} className="text-foreground hover:bg-accent">
                                            {brand.brand_name}
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
                        </>
                      )}

                      {/* Second Row: Grade and Brand (Hidden for Paper/Board) */}
                      {!isMaterialHierarchyGroup(currentGroupName || '') && (
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
                                    maxLength={60}
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
                                    maxLength={60}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

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
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="e.g., 180"
                                  {...field}
                                  data-testid="input-gsm"
                                  maxLength={3}
                                  onBeforeInput={(e: any) => {
                                    const char = e.data;
                                    const currentValue = (e.target as HTMLInputElement).value;
                                    if (char && (!/^[0-9]$/.test(char) || currentValue.length >= 3)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
                                    field.onChange(value);
                                  }}
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
                                {isKraftReelGroup(currentGroupName || '') ? 'B.F.' : `Grain (${dimensionUnit})`} <span className="text-red-500">*</span>
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

                  {/* Inventory */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Package className="h-5 w-5" />
                        Inventory
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Set your available quantity and unit
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

                      {/* Weight calculation display */}
                      {form.watch("OfferUnit") === "Sheet" && calculateWeightInKg() && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-semibold text-blue-800 dark:text-blue-200">
                              Calculated Weight (KG) = <strong className="text-lg">{calculateWeightInKg()} KG</strong>
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Formula: (GSM × Deckle_cm × Grain_cm × Quantity) ÷ 10,000,000
                          </p>
                          <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                            {form.watch("quantity")} sheets × {((form.watch("Deckle_mm") || 0) / 10).toFixed(1)}cm × {((form.watch("grain_mm") || 0) / 10).toFixed(1)}cm × {form.watch("GSM")} GSM
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Quantity <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="Enter quantity"
                                  {...field}
                                  data-testid="input-quantity"
                                  maxLength={6}
                                  onBeforeInput={(e: any) => {
                                    const char = e.data;
                                    if (char && !/^[0-9]$/.test(char)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    field.onChange(value);
                                  }}
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
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="Enter stock age in days (e.g., 30)"
                                  {...field}
                                  data-testid="input-stock-age"
                                  maxLength={3}
                                  onBeforeInput={(e: any) => {
                                    const char = e.data;
                                    if (char && !/^[0-9]$/.test(char)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    field.onChange(value);
                                  }}
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

                  {/* Pricing Section */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <IndianRupee className="h-5 w-5" />
                        Pricing
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Set your offer rate and visibility preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="offerRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">
                                Offer Rate (per {form.watch("OfferUnit") || "unit"})
                                <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    <IndianRupee className="h-4 w-4" />
                                  </span>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Enter rate"
                                    {...field}
                                    data-testid="input-offer-rate"
                                    maxLength={10}
                                    onBeforeInput={(e: any) => {
                                      const char = e.data;
                                      if (char && !/^[0-9.]$/.test(char)) {
                                        e.preventDefault();
                                      }
                                    }}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9.]/g, '');
                                      // Only allow one decimal point
                                      const parts = value.split('.');
                                      const sanitized = parts.length > 2
                                        ? parts[0] + '.' + parts.slice(1).join('')
                                        : value;
                                      field.onChange(sanitized);
                                    }}
                                    className="pl-9 bg-popover border-border text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="showRateInMarketplace"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/50">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-show-rate"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-foreground font-medium">
                                Show rate in marketplace
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                When unchecked, "Rate on request" will be displayed to buyers instead of the actual rate
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
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
                    <CardContent className="space-y-6">
                      {/* Packing Type and Sheets Per Packet */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="packingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Packing Type</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger className="bg-popover border-border text-foreground">
                                    <SelectValue placeholder="Select packing type" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border-border">
                                    <SelectItem value="Original MILL Packing" className="text-foreground hover:bg-accent">
                                      Original MILL Packing
                                    </SelectItem>
                                    <SelectItem value="Repack by the seller" className="text-foreground hover:bg-accent">
                                      Repack by the seller
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sheetsPerPacket"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground">Sheets Per Packet</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger className="bg-popover border-border text-foreground">
                                    <SelectValue placeholder="Select sheets per packet" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover border-border">
                                    <SelectItem value="50" className="text-foreground hover:bg-accent">50</SelectItem>
                                    <SelectItem value="72" className="text-foreground hover:bg-accent">72</SelectItem>
                                    <SelectItem value="100" className="text-foreground hover:bg-accent">100</SelectItem>
                                    <SelectItem value="144" className="text-foreground hover:bg-accent">144</SelectItem>
                                    <SelectItem value="150" className="text-foreground hover:bg-accent">150</SelectItem>
                                    <SelectItem value="200" className="text-foreground hover:bg-accent">200</SelectItem>
                                    <SelectItem value="250" className="text-foreground hover:bg-accent">250</SelectItem>
                                    <SelectItem value="500" className="text-foreground hover:bg-accent">500</SelectItem>
                                    <SelectItem value="Others" className="text-foreground hover:bg-accent">Others</SelectItem>
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
                            <FormLabel className="text-foreground">Seller Comments</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add any special notes, delivery terms, or additional specifications..."
                                className="min-h-[100px] bg-popover border-border text-foreground placeholder:text-muted-foreground"
                                {...field}
                                data-testid="textarea-comments"
                                maxLength={400}
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
                        "Save Offer"
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