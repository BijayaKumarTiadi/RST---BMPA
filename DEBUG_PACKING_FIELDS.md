# DEBUG GUIDE - Packing Fields Not Saving

## Steps to Debug:

### 1. Check Database Columns Exist
Run this SQL:
```sql
SHOW COLUMNS FROM deal_master LIKE '%packing%';
SHOW COLUMNS FROM deal_master LIKE '%sheets%';
```

**Expected Result:**
- `packing_type` VARCHAR(50)
- `sheets_per_packet` VARCHAR(20)

**If columns don't exist, run:**
```sql
ALTER TABLE deal_master 
ADD COLUMN packing_type VARCHAR(50) NULL,
ADD COLUMN sheets_per_packet VARCHAR(20) NULL;
```

### 2. Restart the Server
The backend code has been updated with debug logging. Restart the server to load the changes.

### 3. Create a New Offer
1. Go to Add Offer page
2. Fill in all required fields
3. **IMPORTANT**: Fill in the packing fields:
   - Packing Type: Select "Original MILL Packing"
   - Sheets Per Packet: Select "100"
4. Click Save

### 4. Check Server Console Logs
Look for these debug messages in the server console:

```
🔍 PACKING FIELDS DEBUG: {
  packing_type: 'Original MILL Packing',
  sheets_per_packet: '100',
  ...
}

💾 VALUES BEFORE INSERT: {
  packing_type_value: 'Original MILL Packing',
  sheets_per_packet_value: '100',
  ...
}
```

### 5. Check Database
```sql
SELECT TransID, packing_type, sheets_per_packet, Make, Grade, Brand 
FROM deal_master 
ORDER BY TransID DESC 
LIMIT 1;
```

## Possible Issues:

### Issue 1: Columns Don't Exist
**Solution**: Run the ALTER TABLE command above

### Issue 2: Values are NULL in console logs
**Problem**: Frontend not sending the data
**Check**: Browser console for the payload being sent

### Issue 3: Values are correct in logs but NULL in database
**Problem**: SQL INSERT issue
**Solution**: Check the number of placeholders (?) matches the number of values

### Issue 4: Server not restarted
**Solution**: Stop and restart the server to load the new code

## Quick Test:

1. **Restart server**
2. **Add new offer** with packing fields filled
3. **Check server console** for debug logs
4. **Check database** for the new record
5. **Report back** what you see in the console logs

The debug logs will tell us exactly where the problem is!
