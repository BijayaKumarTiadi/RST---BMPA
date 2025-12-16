# Material Hierarchy - Complete Implementation Plan

## Understanding the Two Systems

### OLD System (Currently in use):
```
Product Group → Make → Grade → Brand
(Uses: stock_make_master, stock_grade, stock_brand tables)
```

### NEW System (For Paper/Board ONLY):
```
Grade of Material → Material Kind → Manufacturer → Brand Name
(Uses: material_hierarchy table)
```

## Implementation Strategy

For **PAPER and BOARD** products:
- Replace the old Make/Grade/Brand fields
- Use the new Grade of Material → Material Kind → Manufacturer → Brand Name hierarchy
- ALL fields are dropdown-only (no text input)

For **OTHER** products (Kraft Reel, Spare Parts, etc.):
- Keep the old Make/Grade/Brand system
- Can remain as autocomplete or change to dropdown

## Database Mapping

### For Paper/Board:
```
deal_master.Make → Store: Grade of Material
deal_master.Grade → Store: Material Kind  
deal_master.Brand → Store: Manufacturer
NEW COLUMN needed: material_brand_name → Store: Brand Name
```

OR create a separate table:
```sql
CREATE TABLE deal_material_hierarchy (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deal_id INT NOT NULL,
  grade_of_material VARCHAR(100),
  material_kind VARCHAR(100),
  manufacturer VARCHAR(100),
  brand_name VARCHAR(100),
  FOREIGN KEY (deal_id) REFERENCES deal_master(TransID)
);
```

## Frontend Changes Needed

### 1. Update Schema (add-product.tsx)
```typescript
const dealSchema = z.object({
  groupID: z.string().min(1, "Product group is required"),
  groupName: z.string().optional(),
  
  // For Paper/Board - NEW fields
  gradeOfMaterial: z.string().optional(),
  materialKind: z.string().optional(),
  materialManufacturer: z.string().optional(),
  materialBrandName: z.string().optional(),
  
  // For other products - OLD fields
  MakeID: z.string().optional(),
  GradeID: z.string().optional(),
  BrandID: z.string().optional(),
  makeText: z.string().optional(),
  gradeText: z.string().optional(),
  brandText: z.string().optional(),
  
  // ... rest
});
```

### 2. Add State Variables
```typescript
// Material hierarchy states (for Paper/Board)
const [selectedGradeOfMaterial, setSelectedGradeOfMaterial] = useState("");
const [selectedMaterialKind, setSelectedMaterialKind] = useState("");
const [selectedMaterialManufacturer, setSelectedMaterialManufacturer] = useState("");
const [selectedMaterialBrandName, setSelectedMaterialBrandName] = useState("");
```

### 3. Add useQuery Hooks
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

// Similar for material-kinds, manufacturers, brands
```

### 4. Form Layout for Paper/Board

Replace the current Make/Grade/Brand fields with:

```tsx
{(isPaperGroup(currentGroupName || '') || isBoardGroup(currentGroupName || '')) ? (
  <>
    {/* NEW Material Hierarchy */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Grade of Material */}
      <FormField
        control={form.control}
        name="gradeOfMaterial"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Grade of Material <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Select
                value={selectedGradeOfMaterial}
                onValueChange={(value) => {
                  setSelectedGradeOfMaterial(value);
                  form.setValue("gradeOfMaterial", value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade of material" />
                </SelectTrigger>
                <SelectContent>
                  {(gradesOfMaterial || []).map((grade: any) => (
                    <SelectItem key={grade.grade_of_material} value={grade.grade_of_material}>
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

      {/* Material Kind */}
      <FormField
        control={form.control}
        name="materialKind"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Material Kind <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Select
                value={selectedMaterialKind}
                onValueChange={(value) => {
                  setSelectedMaterialKind(value);
                  form.setValue("materialKind", value);
                }}
                disabled={!selectedGradeOfMaterial}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedGradeOfMaterial ? "Select grade first" : "Select material kind"} />
                </SelectTrigger>
                <SelectContent>
                  {(materialKinds || []).map((kind: any) => (
                    <SelectItem key={kind.material_kind} value={kind.material_kind}>
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
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Manufacturer */}
      <FormField
        control={form.control}
        name="materialManufacturer"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Manufacturer <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Select
                value={selectedMaterialManufacturer}
                onValueChange={(value) => {
                  setSelectedMaterialManufacturer(value);
                  form.setValue("materialManufacturer", value);
                }}
                disabled={!selectedMaterialKind}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedMaterialKind ? "Select material kind first" : "Select manufacturer"} />
                </SelectTrigger>
                <SelectContent>
                  {(materialManufacturers || []).map((mfr: any) => (
                    <SelectItem key={mfr.manufacturer} value={mfr.manufacturer}>
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

      {/* Brand Name */}
      <FormField
        control={form.control}
        name="materialBrandName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Name <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Select
                value={selectedMaterialBrandName}
                onValueChange={(value) => {
                  setSelectedMaterialBrandName(value);
                  form.setValue("materialBrandName", value);
                }}
                disabled={!selectedMaterialManufacturer}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedMaterialManufacturer ? "Select manufacturer first" : "Select brand"} />
                </SelectTrigger>
                <SelectContent>
                  {(materialBrands || []).map((brand: any) => (
                    <SelectItem key={brand.brand_name} value={brand.brand_name}>
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
) : (
  <>
    {/* OLD System for other products */}
    {/* Keep existing Make/Grade/Brand fields */}
  </>
)}
```

## Summary

✅ Backend routes added
✅ Database table created (material_hierarchy)
✅ Service layer ready
🟡 Frontend needs implementation
🟡 Database needs column or new table for storing material hierarchy data

## Next Steps

1. **Run SQL** to populate material_hierarchy table
2. **Restart server**
3. **Implement frontend** with the code above
4. **Test** the cascading dropdowns
5. **Update backend** to save the new fields

Would you like me to implement the frontend code now?
