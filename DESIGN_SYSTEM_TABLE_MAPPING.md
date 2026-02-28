# Design System Component Mapping

## Current Tables in App.tsx → Design System Migration

### Table Inventory

This document maps every table/data grid in the codebase to the new design system.

---

## Table 1: SKU Performance (Highest Error SKUs)

**File:** App.tsx  
**Line:** ~3000  
**Component:** Backtest results table  
**Columns:** SKU, MAPE, Accuracy, RMSE, Bias %, Forecasts  

### Current Implementation
```tsx
<table className="w-full text-xs">
  <thead>
    <tr className="border-b border-slate-700">
      <th className="text-left py-3 px-4 font-black text-slate-300 uppercase tracking-widest">SKU</th>
      {/* More headers... */}
    </tr>
  </thead>
  <tbody>
    {backtestResults.worstSkus.map((sku, idx) => (
      <tr className={`border-b border-slate-800 hover:bg-slate-800/50 ${idx < 3 ? 'bg-red-500/5' : ''}`}>
        <td className="py-3 px-4 font-black text-indigo-400">{sku.sku}</td>
        {/* More cells... */}
      </tr>
    ))}
  </tbody>
</table>
```

### New Implementation
```tsx
<Table variant="compact">
  <TableHeader>
    <TableRow>
      <TableCell isHeader align="left">SKU</TableCell>
      {/* More headers... */}
    </TableRow>
  </TableHeader>
  <TableBody>
    {backtestResults.worstSkus.map((sku, idx) => (
      <TableRow key={sku.sku} isHighlighted={idx < 3}>
        <TableCell className="font-black text-[var(--color-accent)]">
          {sku.sku}
        </TableCell>
        {/* More cells... */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Color Mapping
| Value | Old Class | New Token |
|-------|-----------|-----------|
| SKU | `text-indigo-400` | `text-[var(--color-accent)]` |
| MAPE (high error) | `text-red-400` | `text-[var(--color-destructive)]` |
| Accuracy | `text-slate-300` | `text-[var(--color-foreground)]` |
| Background (top 3) | `bg-red-500/5` | `bg-[var(--color-warning-foreground)]` |

### Migration Status
- [ ] Code updated
- [ ] Tested in light mode
- [ ] Tested in dark mode
- [ ] Export/print CSS validated

---

## Table 2: Portfolio Changes

**File:** App.tsx  
**Line:** ~3493  
**Component:** Category transformation table  
**Columns:** Date, From Category, To Category, Quantity, Change %  

### Current Implementation
```tsx
<table>
  <thead>
    <tr>
      <th className="text-left py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
      {/* More headers... */}
    </tr>
  </thead>
  <tbody>
    {portChanges.map((change) => (
      <tr className="border-b border-slate-800">
        <td className="py-2 px-3 text-[10px] text-slate-400">{change.date}</td>
        {/* More cells... */}
      </tr>
    ))}
  </tbody>
</table>
```

### New Implementation
```tsx
<Table variant="compact">
  <TableHeader>
    <TableRow>
      <TableCell isHeader>Date</TableCell>
      <TableCell isHeader>From</TableCell>
      <TableCell isHeader>To</TableCell>
      <TableCell isHeader align="right">Quantity</TableCell>
      <TableCell isHeader align="right">Change %</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {portChanges.map((change) => (
      <TableRow key={change.id}>
        <TableCell className="text-[var(--color-muted-foreground)]">
          {change.date}
        </TableCell>
        {/* More cells... */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Migration Status
- [ ] Code updated
- [ ] Tested
- [ ] Data colors verified

---

## Table 3: Training Panel Data Stats

**File:** TrainingPanel.tsx  
**Component:** Aggregated data statistics grid  

### Current Implementation
```tsx
<div className="grid grid-cols-2 gap-2 text-sm text-green-700">
  <p>📊 Total SKUs: <span className="font-bold">{data.skus.length}</span></p>
  <p>📈 Aggregated Records: <span className="font-bold">{data.data.length}</span></p>
  <p>🗜️ Compression: <span className="font-bold">{stats?.compressionRatio}x</span></p>
  <p>📦 Raw Records: <span className="font-bold">{stats?.rawRecords}</span></p>
</div>
```

### New Implementation (Using Card Component - TODO)
```tsx
<div className="grid grid-cols-2 gap-var(--spacing-md)">
  <div className="p-[var(--spacing-lg)] bg-[var(--color-success-foreground)] rounded-[var(--radius-lg)]">
    <p className="text-[var(--font-size-sm)] text-[var(--color-muted-foreground)]">Total SKUs</p>
    <p className="text-[var(--font-size-lg)] font-bold text-[var(--color-success)]">
      {data.skus.length}
    </p>
  </div>
  {/* More stat cards... */}
</div>
```

### New Component Needed
- `Card.tsx` - Reusable card with stat display capability
- `StatCard.tsx` - Specialized stat display card

### Migration Status
- [ ] Card component created
- [ ] StatCard component created
- [ ] Stats grid updated
- [ ] Colors tested

---

## Table 4: Report Modal Tables (Multiple)

**File:** ReportModal.tsx (Lines 144+)  
**Components:** Multiple small tables in report generation  

### Key Issues
1. Print CSS has massive override section with hardcoded colors
2. Light theme export doesn't match design system
3. Multiple color inconsistencies

### Example: KPI Table
**Current:**
```tsx
{data.kpis.slice(0, 3).map((kpi, i) => (
  <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl">
    <p className="text-[10px] font-black text-slate-400 uppercase">{kpi.label}</p>
    <div className="flex items-baseline gap-3">
      <p className="text-[24px] font-black text-slate-900">{kpi.value}</p>
    </div>
  </div>
))}
```

**New:**
```tsx
{data.kpis.slice(0, 3).map((kpi, i) => (
  <div className="px-6 py-4 bg-[var(--color-secondary)] border border-[var(--color-border)] rounded-[var(--radius-2xl)]">
    <p className="text-[var(--font-size-xs)] font-[var(--font-weight-black)] text-[var(--color-muted-foreground)] uppercase">
      {kpi.label}
    </p>
    <div className="flex items-baseline gap-[var(--spacing-lg)]">
      <p className="text-[var(--font-size-3xl)] font-[var(--font-weight-black)] text-[var(--color-foreground)]">
        {kpi.value}
      </p>
    </div>
  </div>
))}
```

### Migration Status
- [ ] Print CSS refactored
- [ ] Light theme tested
- [ ] Export colors verified
- [ ] All report sections updated

---

## Component Library Needed

To support all tables and UI elements, create these components:

### Priority 1 (Required for Tables)
- [x] `Table.tsx` - Already created
- [ ] `Card.tsx` - Container component
- [ ] `Badge.tsx` - Status badges

### Priority 2 (Related Controls)
- [ ] `Button.tsx` - All button variants
- [ ] `Input.tsx` - Form inputs with token support
- [ ] `Select.tsx` - Dropdown selection

### Priority 3 (Nice to Have)
- [ ] `Modal.tsx` - Dialog modals
- [ ] `Tooltip.tsx` - Hover tooltips
- [ ] `Alert.tsx` - Alert messages
- [ ] `Pagination.tsx` - Table pagination
- [ ] `Breadcrumb.tsx` - Navigation breadcrumbs

---

## Implementation Timeline

### Week 1: Table Component & Tokens ✅
- [x] Create DESIGN_SYSTEM_TOKENS.css
- [x] Create Table.tsx component
- [ ] Test Table in isolation

### Week 2: Migrate SKU Performance Table
- [ ] Update App.tsx table 1
- [ ] Test all modes (light/dark)
- [ ] Test export/print

### Week 3: Migrate Portfolio Changes Table
- [ ] Update App.tsx table 2
- [ ] Create supporting components (Card, Badge)
- [ ] Test data colors

### Week 4: Migrate Training Panel & Report Modal
- [ ] Update TrainingPanel.tsx
- [ ] Refactor Report Modal
- [ ] Fix export CSS

### Week 5: Polish & Theme Switching
- [ ] Create theme selector UI
- [ ] Add theme persistence
- [ ] Final QA

---

## Testing Requirements

For each table migration:

### Visual Testing
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] Hover states work
- [ ] Highlighting works (if applicable)
- [ ] Colors match design tokens

### Functional Testing
- [ ] Data displays correctly
- [ ] Sorting works (if applicable)
- [ ] Filtering works (if applicable)
- [ ] Export works
- [ ] Print preview shows correctly

### Accessibility Testing
- [ ] Table structure is semantic
- [ ] Headers marked with <th>
- [ ] Color not used as only indicator
- [ ] Keyboard navigation works
- [ ] Screen reader friendly

### Performance Testing
- [ ] No layout shifts
- [ ] No performance regression
- [ ] Component renders < 100ms

---

## Color Decision Matrix

When updating a table cell color, use this matrix:

```
IF Value Type = SKU, ID, or Key Identifier
  THEN USE: var(--color-accent) [highlights the important value]

IF Value Type = Error, High MAPE, or Bad Performance
  THEN USE: var(--color-destructive) [red - indicates problem]

IF Value Type = Success, Accurate Forecast, or Good Performance
  THEN USE: var(--color-success) [green - indicates good]

IF Value Type = Warning or Caution Needed
  THEN USE: var(--color-warning) [orange - needs attention]

IF Value Type = Regular Text or Secondary Info
  THEN USE: var(--color-foreground) [default text]

IF Value Type = Muted or Disabled
  THEN USE: var(--color-muted-foreground) [gray]
```

### Example Application

```tsx
// SKU (identifier) → accent color
<TableCell className="text-[var(--color-accent)]">SKU-101</TableCell>

// MAPE High (error) → destructive color  
<TableCell className="text-[var(--color-destructive)]">45.3%</TableCell>

// Accuracy High (success) → success color
<TableCell className="text-[var(--color-success)]">94.2%</TableCell>

// Regular value → foreground color
<TableCell>{formatNumber(rmse)}</TableCell>
```

---

## Next Steps

1. ✅ Review this document
2. ✅ Check current tables in App.tsx line ~3000
3. ⬜ Start with Table 1 (SKU Performance)
4. ⬜ Test thoroughly
5. ⬜ Move to Table 2
6. ⬜ Create supporting components as needed
7. ⬜ Build theme switcher

**Ready to start? See [DESIGN_SYSTEM_QUICK_START.md](DESIGN_SYSTEM_QUICK_START.md)**
