# Material Hierarchy Implementation Guide

## Overview
This implements a cascading dropdown system for Paper/Board products:
- Grade of Material → Material Kind → Manufacturer → Brand Name

## Files Created

### 1. Database Schema (`server/material_hierarchy.sql`)
✅ Created table `material_hierarchy` with all data from JSON
✅ Includes indexes for performance
✅ Ready to run with MySQL

### 2. Service Layer (`server/materialHierarchyService.ts`)
✅ Created service functions for cascading filters:
- `getGradesOfMaterial()` - Get all grade options
- `getMaterialKinds(gradeOfMaterial?)` - Get material kinds filtered by grade
- `getMaterialManufacturers(gradeOfMaterial?, materialKind?)` - Get manufacturers
- `getMaterialBrands(gradeOfMaterial?, materialKind?, manufacturer?)` - Get brands

## Implementation Steps

### Step 1: Run Database Migration
```bash
# Run the SQL file to create table and insert data
mysql -u your_user -p your_database < server/material_hierarchy.sql
```

### Step 2: Add Routes to `server/routes.ts`

Add import at the top:
```typescript
import * as materialHierarchyService from "./materialHierarchyService";
```

Add these routes (around line 1650, near other API routes):
```typescript
// Material Hierarchy Routes
app.get('/api/material-hierarchy/grades', async (req, res) => {
  try {
    const grades = await materialHierarchyService.getGradesOfMaterial();
    res.json(grades);
  } catch (error) {
    console.error("Error fetching grades of material:", error);
    res.status(500).json({ message: "Failed to fetch grades of material" });
  }
});

app.get('/api/material-hierarchy/material-kinds', async (req, res) => {
  try {
    const { gradeOfMaterial } = req.query;
    const materialKinds = await materialHierarchyService.getMaterialKinds(gradeOfMaterial as string);
    res.json(materialKinds);
  } catch (error) {
    console.error("Error fetching material kinds:", error);
    res.status(500).json({ message: "Failed to fetch material kinds" });
  }
});

app.get('/api/material-hierarchy/manufacturers', async (req, res) => {
  try {
    const { gradeOfMaterial, materialKind } = req.query;
    const manufacturers = await materialHierarchyService.getMaterialManufacturers(
      gradeOfMaterial as string,
      materialKind as string
    );
    res.json(manufacturers);
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    res.status(500).json({ message: "Failed to fetch manufacturers" });
  }
});

app.get('/api/material-hierarchy/brands', async (req, res) => {
  try {
    const { gradeOfMaterial, materialKind, manufacturer } = req.query;
    const brands = await materialHierarchyService.getMaterialBrands(
      gradeOfMaterial as string,
      materialKind as string,
      manufacturer as string
    );
    res.json(brands);
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ message: "Failed to fetch brands" });
  }
});
```

### Step 3: Update Frontend Schema (`client/src/pages/add-product.tsx`)

Update the schema (around line 60):
```typescript
const dealSchema = z.object({
  groupID: z.string().min(1, "Product group is required"),
  groupName: z.string().optional(),
  // Regular product fields
  MakeID: z.string().optional(),
  GradeID: z.string().optional(), // This will become Material Kind ID
  BrandID: z.string().optional(),
  makeText: z.string().optional(),
  gradeText: z.string().optional(), // This will become Material Kind
  brandText: z.string().optional(),
  gradeOfMaterial: z.string().optional(), // NEW: Grade of Material
  materialKindText: z.string().optional(), // NEW: Material Kind (renamed from Grade)
  materialManufacturer: z.string().optional(), // NEW: Manufacturer
  materialBrand: z.string().optional(), // NEW: Brand Name
  // ... rest of schema
});
```

### Step 4: Add State Variables in Frontend

Add these state variables (around line 220):
```typescript
// Material hierarchy states
const [selectedGradeOfMaterial, setSelectedGradeOfMaterial] = useState("");
const [selectedMaterialKind, setSelectedMaterialKind] = useState("");
const [selectedMaterialManufacturer, setSelectedMaterialManufacturer] = useState("");
const [selectedMaterialBrand, setSelectedMaterialBrand] = useState("");
```

### Step 5: Add useQuery Hooks for Material Hierarchy

Add these queries (around line 400):
```typescript
// Fetch Grades of Material
const { data: gradesOfMaterial } = useQuery({
  queryKey: ["/api/material-hierarchy/grades"],
  queryFn: async () => {
    const response = await fetch('/api/material-hierarchy/grades');
    if (!response.ok) throw new Error('Failed to fetch grades');
    return response.json();
  },
  enabled: isPaperGroup(currentGroupName || '') || isBoardGroup(currentGroupName || ''),
});

// Fetch Material Kinds (filtered by Grade of Material)
const { data: materialKinds } = useQuery({
  queryKey: ["/api/material-hierarchy/material-kinds", selectedGradeOfMaterial],
  queryFn: async () => {
    const url = selectedGradeOfMaterial
      ? `/api/material-hierarchy/material-kinds?gradeOfMaterial=${encodeURIComponent(selectedGradeOfMaterial)}`
      : '/api/material-hierarchy/material-kinds';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch material kinds');
    return response.json();
  },
  enabled: (isPaperGroup(currentGroupName || '') || isBoardGroup(currentGroupName || '')) && !!selectedGradeOfMaterial,
});

// Fetch Manufacturers (filtered by Grade and Material Kind)
const { data: materialManufacturers } = useQuery({
  queryKey: ["/api/material-hierarchy/manufacturers", selectedGradeOfMaterial, selectedMaterialKind],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (selectedGradeOfMaterial) params.append('gradeOfMaterial', selectedGradeOfMaterial);
    if (selectedMaterialKind) params.append('materialKind', selectedMaterialKind);
    const response = await fetch(`/api/material-hierarchy/manufacturers?${params}`);
    if (!response.ok) throw new Error('Failed to fetch manufacturers');
    return response.json();
  },
  enabled: (isPaperGroup(currentGroupName || '') || isBoardGroup(currentGroupName || '')) && !!selectedMaterialKind,
});

// Fetch Brands (filtered by all previous selections)
const { data: materialBrands } = useQuery({
  queryKey: ["/api/material-hierarchy/brands", selectedGradeOfMaterial, selectedMaterialKind, selectedMaterialManufacturer],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (selectedGradeOfMaterial) params.append('gradeOfMaterial', selectedGradeOfMaterial);
    if (selectedMaterialKind) params.append('materialKind', selectedMaterialKind);
    if (selectedMaterialManufacturer) params.append('manufacturer', selectedMaterialManufacturer);
    const response = await fetch(`/api/material-hierarchy/brands?${params}`);
    if (!response.ok) throw new Error('Failed to fetch brands');
    return response.json();
  },
  enabled: (isPaperGroup(currentGroupName || '') || isBoardGroup(currentGroupName || '')) && !!selectedMaterialManufacturer,
});
```

### Step 6: Add useEffect to Clear Dependent Fields

```typescript
// Clear dependent fields when Grade of Material changes
useEffect(() => {
  if (selectedGradeOfMaterial) {
    setSelectedMaterialKind("");
    setSelectedMaterialManufacturer("");
    setSelectedMaterialBrand("");
    form.setValue("materialKindText", "");
    form.setValue("materialManufacturer", "");
    form.setValue("materialBrand", "");
  }
}, [selectedGradeOfMaterial]);

// Clear dependent fields when Material Kind changes
useEffect(() => {
  if (selectedMaterialKind) {
    setSelectedMaterialManufacturer("");
    setSelectedMaterialBrand("");
    form.setValue("materialManufacturer", "");
    form.setValue("materialBrand", "");
  }
}, [selectedMaterialKind]);

// Clear Brand when Manufacturer changes
useEffect(() => {
  if (selectedMaterialManufacturer) {
    setSelectedMaterialBrand("");
    form.setValue("materialBrand", "");
  }
}, [selectedMaterialManufacturer]);
```

### Step 7: Update Form Layout

The Grade of Material field is already added. Now add the cascading dropdowns after it:

```tsx
{/* Material Kind (formerly "Grade") - Only for Paper/Board */}
{(isPaperGroup(currentGroupName || '') || isBoardGroup(currentGroupName || '')) && (
  <FormField
    control={form.control}
    name="materialKindText"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-foreground">Material Kind</FormLabel>
        <FormControl>
          <Select
            value={selectedMaterialKind}
            onValueChange={(value) => {
              setSelectedMaterialKind(value);
              form.setValue("materialKindText", value);
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
)}

{/* Manufacturer - Only for Paper/Board */}
{(isPaperGroup(currentGroupName || '') || isBoardGroup(currentGroupName || '')) && (
  <FormField
    control={form.control}
    name="materialManufacturer"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-foreground">Manufacturer</FormLabel>
        <FormControl>
          <Select
            value={selectedMaterialManufacturer}
            onValueChange={(value) => {
              setSelectedMaterialManufacturer(value);
              form.setValue("materialManufacturer", value);
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
)}

{/* Brand Name - Only for Paper/Board */}
{(isPaperGroup(currentGroupName || '') || isBoardGroup(currentGroupName || '')) && (
  <FormField
    control={form.control}
    name="materialBrand"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-foreground">Brand Name</FormLabel>
        <FormControl>
          <Select
            value={selectedMaterialBrand}
            onValueChange={(value) => {
              setSelectedMaterialBrand(value);
              form.setValue("materialBrand", value);
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
)}
```

### Step 8: Update Database Table

Add columns to the deals table:
```sql
ALTER TABLE deals 
ADD COLUMN material_kind VARCHAR(100) NULL,
ADD COLUMN material_manufacturer VARCHAR(100) NULL,
ADD COLUMN material_brand VARCHAR(100) NULL;
```

## Summary

✅ Database table created with all material hierarchy data
✅ Backend service layer for cascading filters
✅ API routes for fetching filtered data
✅ Frontend schema updated
✅ Cascading dropdown logic implemented
✅ Dependent field clearing on parent change

## Cascading Flow

1. User selects **Grade of Material** (e.g., "VIRGIN")
2. **Material Kind** dropdown populates with options for VIRGIN (FBB, SBS, CUP STOCK, OTHERS)
3. User selects **Material Kind** (e.g., "FBB")
4. **Manufacturer** dropdown populates with options for VIRGIN + FBB (ITC, EMAMI, JK, TNPL, CENTURY, IMPORTED, OTHERS)
5. User selects **Manufacturer** (e.g., "ITC")
6. **Brand Name** dropdown populates with options for VIRGIN + FBB + ITC (CYBER XL, PEARL XL, OTHERS)

Each dropdown is disabled until its parent is selected!
