# Grade of Material Field Implementation

## Changes Made:

### 1. Schema Update (Line 65) ✅
Added to the schema:
```typescript
gradeOfMaterial: z.string().optional(), // Grade of Material for Paper/Board
```

### 2. UI Field to Add

**Location**: After Product Group field (around line 1566)

**Add this code**:

```tsx
{/* Grade of Material - Only for Paper/Board */}
{(isPaperGroup(currentGroupName || '') || isBoardGroup(currentGroupName || '')) && (
  <FormField
    control={form.control}
    name="gradeOfMaterial"
    render={({ field }) => (
      <FormItem>
        <FormLabel className="text-foreground">Grade of Material</FormLabel>
        <FormControl>
          <Input
            type="text"
            placeholder="Enter grade of material"
            {...field}
            className="bg-popover border-border text-foreground placeholder:text-muted-foreground"
            maxLength={100}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

### 3. Form Structure

**For Paper/Board products**:
- Row 1: Product Group | Grade of Material
- Row 2: Product Make (full width)
- Row 3: Grade | Brand

**For other products**:
- Row 1: Product Group | Product Make
- Row 2: Grade | Brand

### 4. Backend - Save the field

The `gradeOfMaterial` field will automatically be included in the form submission since it's in the schema.

Make sure the database table has a `grade_of_material` column (VARCHAR(100)).

### 5. SQL Migration (if needed)

```sql
ALTER TABLE deals ADD COLUMN grade_of_material VARCHAR(100) NULL;
```

## Summary:

✅ Schema updated with `gradeOfMaterial` field
✅ Field shows only for Paper and Board products  
✅ Field is optional (not required)
✅ Max length: 100 characters
✅ Will be saved automatically with form submission
