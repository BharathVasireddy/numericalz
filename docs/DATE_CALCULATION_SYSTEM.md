# Numericalz Date Calculation System Documentation

## 🎯 Overview

This document outlines the **centralized date calculation system** for Numericalz, ensuring 100% consistency across all components, APIs, and user interfaces.

## 🚨 CRITICAL PRINCIPLE: Companies House Official Data

### **WHAT WE USE DIRECTLY FROM COMPANIES HOUSE**
- **✅ Accounts Due Date**: Use `companyData.accounts.next_due` directly (official HMRC deadline)
- **✅ Confirmation Statement Due**: Use `companyData.confirmation_statement.next_due` directly
- **✅ Reference Data**: Accounting reference date, last accounts, incorporation date

### **WHAT WE CALCULATE OURSELVES**
- **✅ Year End Date**: For display purposes and CT calculations
- **✅ Corporation Tax Due**: 12 months after year end (not provided by Companies House)

### **Implementation Pattern**
```typescript
// ✅ CORRECT: Use Companies House accounts due date directly
nextAccountsDue: companyData.accounts?.next_due ? new Date(companyData.accounts.next_due) : null

// ✅ CORRECT: Calculate year end for display and CT calculations
const yearEnd = calculateYearEnd(clientData)
const ctDue = calculateCorporationTaxDue(clientData)

// ❌ FORBIDDEN: Calculate accounts due dates ourselves
// nextAccountsDue: calculateAccountsDue(clientData) // DON'T DO THIS
```

### **Why This Approach?**
- **Official Data**: Companies House provides the official HMRC filing deadlines
- **Always Current**: Refreshing from Companies House updates all deadlines automatically
- **No Calculation Errors**: Eliminates discrepancies between our calculations and official dates
- **Compliance**: Ensures we always use the legally binding deadlines

## 🎯 Core Principles

### 1. **Single Source of Truth**
- All date calculations use functions from `lib/year-end-utils.ts`
- No hardcoded date calculations in components or APIs
- Consistent logic across all pages (tables, forms, views)

### 2. **UK Accounting Compliance**
- Proper first-time filer vs established company logic
- 6-18 month rule for first accounting periods
- Standard 9-month accounts filing deadline
- Standard 12-month corporation tax deadline

### 3. **Data Source Priority**
- **Reference Data**: From Companies House (accounting reference date, last accounts, incorporation date)
- **Calculated Dates**: By our system (accounts due, corporation tax due)
- **Direct Dates**: From Companies House (confirmation statements only)

## 🔧 Core Functions

### `calculateYearEnd(clientData: ClientYearEndData): Date | null`

**Purpose**: Calculate the next year end date for a company

**Logic Priority**:
1. **Established Companies**: Last accounts made up to + 1 year
2. **First-time Filers**: Accounting reference date with 6-month minimum rule
3. **Fallback**: Current/next year based on accounting reference date

**Parameters**:
```typescript
interface ClientYearEndData {
  accountingReferenceDate?: string | null  // JSON: {"day":"30","month":"09"} or ISO date
  lastAccountsMadeUpTo?: string | Date | null
  incorporationDate?: string | Date | null
}
```

**Returns**: `Date` object or `null` if cannot calculate

**Example**:
```typescript
const clientData = {
  accountingReferenceDate: '{"day":"30","month":"09"}',
  lastAccountsMadeUpTo: new Date('2023-09-30'),
  incorporationDate: new Date('2021-09-28')
}

const yearEnd = calculateYearEnd(clientData)
// Returns: Date object for 30 Sept 2024 (last accounts + 1 year)
```

### `formatYearEnd(clientData, format?, fallback?): string`

**Purpose**: Format year end date for display

**Parameters**:
- `clientData`: ClientYearEndData object
- `format`: `'short'` (30 Sept 2024) or `'numeric'` (30/09/2024)
- `fallback`: Text to show when no date available

**Usage**:
```typescript
// For tables and views
const displayDate = formatYearEnd(clientData, 'short', '—')
// Returns: "30 Sept 2024" or "—"

// For forms
const formDate = formatYearEnd(clientData, 'numeric', 'Not set')
// Returns: "30/09/2024" or "Not set"
```

### `calculateAccountsDue(clientData: ClientYearEndData): Date | null`

**Purpose**: Calculate accounts due date (9 months after year end)

**UK Rule**: Annual accounts must be filed within 9 months of the accounting period end

**Example**:
```typescript
const accountsDue = calculateAccountsDue(clientData)
// If year end is 30 Sept 2024, returns: 30 June 2025
```

### `calculateCorporationTaxDue(clientData: ClientYearEndData): Date | null`

**Purpose**: Calculate corporation tax due date (12 months after year end)

**UK Rule**: CT600 filing deadline is 12 months after the accounting period end

**Example**:
```typescript
const ctDue = calculateCorporationTaxDue(clientData)
// If year end is 30 Sept 2024, returns: 30 Sept 2025
```

### `calculateAllStatutoryDates(clientData: ClientYearEndData)`

**Purpose**: Calculate all statutory dates in one call

**Returns**:
```typescript
{
  yearEnd: Date | null,
  accountsDue: Date | null,
  corporationTaxDue: Date | null,
  formatted: {
    yearEnd: string,
    accountsDue: string,
    corporationTaxDue: string
  }
}
```

**Usage**:
```typescript
const dates = calculateAllStatutoryDates(clientData)
console.log(dates.formatted.yearEnd)        // "30 Sept 2024"
console.log(dates.formatted.accountsDue)    // "30/06/2025"
console.log(dates.formatted.corporationTaxDue) // "30/09/2025"
```

## 🏗️ Component-Specific Functions

### For Tables: `getYearEndForTable(clientData: ClientYearEndData): string`

**Purpose**: Get year end formatted for table display

**Returns**: Short format with "—" fallback

**Usage**:
```typescript
// In table components
const yearEndDisplay = getYearEndForTable(clientData)
// Returns: "30 Sept 2024" or "—"
```

### For Forms: `getYearEndForForm(clientData: ClientYearEndData): string`

**Purpose**: Get year end formatted for form display

**Returns**: Short format with "Not set" fallback

**Usage**:
```typescript
// In form components
const yearEndDisplay = getYearEndForForm(clientData)
// Returns: "30 Sept 2024" or "Not set"
```

## 🔍 Data Format Handling

### Accounting Reference Date Formats

The system handles multiple formats:

1. **JSON Format** (from Companies House):
   ```json
   {"day":"30","month":"09"}
   ```

2. **ISO Date Format** (from API transformation):
   ```
   "2024-09-29T18:30:00.000Z"
   ```

3. **Date Object**:
   ```javascript
   new Date('2024-09-30')
   ```

### First-time Filer Logic

For companies that haven't filed accounts before:

```typescript
// UK Rule: First accounting period must be 6-18 months
if (!lastAccountsMadeUpTo && incorporationDate) {
  const incorpDate = new Date(incorporationDate)
  let firstYearEnd = new Date(incorpYear, month - 1, day)
  
  // Check 6-month minimum rule
  const monthsDifference = (firstYearEnd - incorpDate) / (1000 * 60 * 60 * 24 * 30.44)
  
  if (firstYearEnd <= incorpDate || monthsDifference < 6) {
    firstYearEnd.setFullYear(incorpYear + 1)
  }
}
```

## 🚫 What NOT to Use

### ❌ FORBIDDEN: Companies House Direct Dates

**NEVER** use these fields directly for statutory calculations:
- `companyData.accounts.next_due` ❌
- `chData.accounts?.next_due` ❌

**WHY**: Companies House calculates dates differently than UK accounting standards

### ❌ FORBIDDEN: Hardcoded Calculations

**NEVER** calculate dates inline in components:
```typescript
// ❌ DON'T DO THIS
const accountsDue = new Date(yearEnd)
accountsDue.setMonth(accountsDue.getMonth() + 9)

// ✅ DO THIS INSTEAD
const accountsDue = calculateAccountsDue(clientData)
```

## 🔧 Implementation Examples

### In API Routes

```typescript
import { calculateAccountsDue, calculateCorporationTaxDue } from '@/lib/year-end-utils'

// Calculate dates for database update
const clientDataForCalculation = {
  accountingReferenceDate: updatedAccountingReferenceDate,
  lastAccountsMadeUpTo: updatedLastAccountsMadeUpTo,
  incorporationDate: updatedIncorporationDate
}

const calculatedAccountsDue = calculateAccountsDue(clientDataForCalculation)
const calculatedCTDue = calculateCorporationTaxDue(clientDataForCalculation)

await db.client.update({
  where: { id },
  data: {
    nextAccountsDue: calculatedAccountsDue,
    nextCorporationTaxDue: calculatedCTDue,
  }
})
```

### In React Components

```typescript
import { getYearEndForTable, formatAccountsDue } from '@/lib/year-end-utils'

function ClientTable({ clients }) {
  return (
    <table>
      {clients.map(client => (
        <tr key={client.id}>
          <td>{getYearEndForTable(client)}</td>
          <td>{formatAccountsDue(client, 'numeric')}</td>
        </tr>
      ))}
    </table>
  )
}
```

### In Forms

```typescript
import { getYearEndForForm, calculateAllStatutoryDates } from '@/lib/year-end-utils'

function EditClientForm({ client }) {
  const dates = calculateAllStatutoryDates(client)
  
  return (
    <form>
      <input 
        value={getYearEndForForm(client)}
        readOnly 
      />
      <input 
        value={dates.formatted.accountsDue}
        readOnly 
      />
    </form>
  )
}
```

## 🧪 Testing & Validation

### Test Data Consistency

```typescript
import { validateStatutoryDates, calculateAllStatutoryDates } from '@/lib/year-end-utils'

const clientData = {
  accountingReferenceDate: client.accountingReferenceDate,
  lastAccountsMadeUpTo: client.lastAccountsMadeUpTo,
  incorporationDate: client.incorporationDate,
  nextAccountsDue: client.nextAccountsDue,
  nextCorporationTaxDue: client.nextCorporationTaxDue
}

const calculated = calculateAllStatutoryDates(clientData)
const validation = validateStatutoryDates(clientData, calculated)

console.log('Accounts Due Consistent:', validation.accountsDue.consistent)
console.log('CT Due Consistent:', validation.corporationTaxDue.consistent)
```

## 📊 Migration Guide

### From Old System to New System

1. **Replace hardcoded calculations**:
   ```typescript
   // ❌ Old way
   const yearEnd = new Date(currentYear, month - 1, day)
   
   // ✅ New way
   const yearEnd = calculateYearEnd(clientData)
   ```

2. **Update API endpoints**:
   ```typescript
   // ❌ Old way
   nextAccountsDue: companyData.accounts?.next_due ? new Date(companyData.accounts.next_due) : null
   
   // ✅ New way
   nextAccountsDue: calculateAccountsDue(clientDataForCalculation)
   ```

3. **Update components**:
   ```typescript
   // ❌ Old way
   const formatYearEnd = (accountingRefDate) => {
     // Custom formatting logic
   }
   
   // ✅ New way
   import { getYearEndForTable } from '@/lib/year-end-utils'
   ```

## 🛡️ Error Handling

### Graceful Fallbacks

All functions handle edge cases gracefully:

```typescript
// Missing data
calculateYearEnd({}) // Returns null

// Invalid dates
calculateYearEnd({ 
  accountingReferenceDate: "invalid" 
}) // Returns null

// Malformed JSON
calculateYearEnd({ 
  accountingReferenceDate: '{"invalid"}' 
}) // Returns null with warning
```

### Error Logging

Functions log warnings for debugging:

```typescript
console.warn('Error parsing accounting reference date:', error)
console.warn('Error parsing last accounts date:', error)
```

## 🔄 Future Maintenance

### Adding New Date Types

To add new statutory date calculations:

1. **Add calculation function**:
   ```typescript
   export function calculateNewDate(clientData: ClientYearEndData): Date | null {
     const yearEnd = calculateYearEnd(clientData)
     if (!yearEnd) return null
     
     // Apply your calculation logic
     const newDate = new Date(yearEnd)
     // ... calculation logic
     return newDate
   }
   ```

2. **Add formatting function**:
   ```typescript
   export function formatNewDate(
     clientData: ClientYearEndData,
     format: 'short' | 'numeric' = 'numeric',
     fallback: string = 'Not set'
   ): string {
     const date = calculateNewDate(clientData)
     if (!date) return fallback
     
     return date.toLocaleDateString('en-GB', {
       day: '2-digit',
       month: format === 'short' ? 'short' : '2-digit',
       year: 'numeric'
     })
   }
   ```

3. **Update `calculateAllStatutoryDates`**:
   ```typescript
   return {
     yearEnd,
     accountsDue,
     corporationTaxDue,
     newDate: calculateNewDate(clientData), // Add new date
     formatted: {
       yearEnd: formatYearEnd(clientData),
       accountsDue: formatAccountsDue(clientData),
       corporationTaxDue: formatCorporationTaxDue(clientData),
       newDate: formatNewDate(clientData) // Add new formatted date
     }
   }
   ```

## 📋 Checklist for Developers

### Before Making Date-Related Changes:

- [ ] Are you using functions from `lib/year-end-utils.ts`?
- [ ] Are you avoiding direct Companies House date usage?
- [ ] Are you handling null/undefined cases?
- [ ] Are you using appropriate fallback text?
- [ ] Are you testing with first-time filers and established companies?
- [ ] Are you maintaining consistency across all pages?

### Code Review Checklist:

- [ ] No hardcoded date calculations
- [ ] No direct use of `companyData.accounts.next_due`
- [ ] Proper error handling and fallbacks
- [ ] Consistent formatting across components
- [ ] Tests cover edge cases (missing data, invalid dates)
- [ ] Documentation updated if new functions added

## 🎯 Success Metrics

A properly implemented date calculation system should achieve:

- **100% Consistency**: Same dates across all pages
- **Zero Discrepancies**: Database matches calculated values
- **UK Compliance**: Proper first-time filer and established company logic
- **Maintainability**: Single source of truth for all calculations
- **Reliability**: Graceful handling of edge cases and errors

---

**Remember**: The goal is 100% robust, consistent, and accurate statutory date calculations that comply with UK accounting standards while maintaining perfect consistency across the entire application. 