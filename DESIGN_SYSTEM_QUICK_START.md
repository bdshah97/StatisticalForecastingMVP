# Design System Implementation Quick Start

## What You Need to Do Right Now

### Step 1: Import the Design System Token CSS

In [index.html](index.html), add this before the Tailwind CDN import:

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Supply Chain Forecasting Tool</title>
    
    <!-- Add this line ↓ -->
    <link rel="stylesheet" href="./DESIGN_SYSTEM_TOKENS.css">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      /* Your existing styles... */
    </style>
</head>
```

### Step 2: Update App.tsx to Import Table Component

At the top of App.tsx (around line 22), add:

```tsx
import { Table, TableHeader, TableBody, TableRow, TableCell } from './components/Table';
```

### Step 3: Replace Hardcoded Tables

#### Table 1: SKU Performance (Looks for "Highest Error SKUs")

**Location:** Around line 3000-3020

**Current Code:**
```tsx
<section className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Highest Error SKUs (Bottom 10)</h3>
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-700">
          <th className="text-left py-3 px-4 font-black text-slate-300 uppercase tracking-widest">SKU</th>
          <th className="text-right py-3 px-4 font-black text-slate-300 uppercase tracking-widest">MAPE</th>
          <th className="text-right py-3 px-4 font-black text-slate-300 uppercase tracking-widest">Accuracy</th>
          <th className="text-right py-3 px-4 font-black text-slate-300 uppercase tracking-widest">RMSE</th>
          <th className="text-right py-3 px-4 font-black text-slate-300 uppercase tracking-widest">Bias %</th>
          <th className="text-right py-3 px-4 font-black text-slate-300 uppercase tracking-widest">Forecasts</th>
        </tr>
      </thead>
      <tbody>
        {backtestResults.worstSkus.map((sku, idx) => (
          <tr key={sku.sku} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${idx < 3 ? 'bg-red-500/5' : ''}`}>
            <td className="py-3 px-4 font-black text-indigo-400">{sku.sku}</td>
            <td className="text-right py-3 px-4 font-bold text-red-400">{sku.mape.toFixed(1)}%</td>
            <td className="text-right py-3 px-4 font-bold text-slate-300">{sku.accuracy.toFixed(1)}%</td>
            <td className="text-right py-3 px-4 text-slate-400">{formatNumber(sku.rmse)}</td>
            <td className="text-right py-3 px-4 text-slate-400">{sku.bias.toFixed(1)}%</td>
            <td className="text-right py-3 px-4 text-slate-400">{sku.forecastCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
```

**Replacement Code:**
```tsx
<section className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Highest Error SKUs (Bottom 10)</h3>
  <Table variant="compact">
    <TableHeader>
      <TableRow>
        <TableCell isHeader align="left">SKU</TableCell>
        <TableCell isHeader align="right">MAPE</TableCell>
        <TableCell isHeader align="right">Accuracy</TableCell>
        <TableCell isHeader align="right">RMSE</TableCell>
        <TableCell isHeader align="right">Bias %</TableCell>
        <TableCell isHeader align="right">Forecasts</TableCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {backtestResults.worstSkus.map((sku, idx) => (
        <TableRow key={sku.sku} isHighlighted={idx < 3}>
          <TableCell align="left" className="font-black text-[var(--color-accent)]">
            {sku.sku}
          </TableCell>
          <TableCell align="right" className="font-bold text-[var(--color-destructive)]">
            {sku.mape.toFixed(1)}%
          </TableCell>
          <TableCell align="right" className="font-bold text-[var(--color-foreground)]">
            {sku.accuracy.toFixed(1)}%
          </TableCell>
          <TableCell align="right">{formatNumber(sku.rmse)}</TableCell>
          <TableCell align="right">{sku.bias.toFixed(1)}%</TableCell>
          <TableCell align="right">{sku.forecastCount}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</section>
```

**Benefits:**
- ✅ 40 fewer lines of JSX
- ✅ Automatic dark mode support
- ✅ Theme-aware colors
- ✅ Consistent styling across the app

---

## Color Token Reference

### Use These Instead of Hardcoded Colors

| Old Tailwind Class | New Token | Purpose |
|------|-----------|---------|
| `text-slate-300` | `text-[var(--color-foreground)]` | Primary text |
| `bg-slate-900` | `bg-[var(--color-background)]` | Card backgrounds |
| `border-slate-700` | `border-[var(--color-border)]` | Borders |
| `text-indigo-400` | `text-[var(--color-accent)]` | Highlighted values (SKU) |
| `text-red-400` | `text-[var(--color-destructive)]` | Error/warning values (MAPE) |
| `hover:bg-slate-800` | `hover:bg-[var(--color-muted)]` | Hover states |
| `text-emerald-600` | `text-[var(--color-success)]` | Success states |
| `text-amber-300` | `text-[var(--color-warning)]` | Warning states |

---

## Quick CSS Variables Cheat Sheet

### Semantic Colors
```css
--color-primary          /* Main brand color */
--color-secondary        /* Supporting color */
--color-success          /* ✅ Success/approved */
--color-warning          /* ⚠️  Warning/alert */
--color-destructive      /* ❌ Error/delete */
--color-info            /* ℹ️  Information */
```

### Spacing (Padding, Margins, Gaps)
```css
--spacing-xs: 4px;
--spacing-sm: 8px;    /* py-2 in Tailwind */
--spacing-md: 12px;   /* py-3 in Tailwind */
--spacing-lg: 16px;   /* py-4 in Tailwind */
```

### Border Radius
```css
--radius-sm: 4px;      /* Small inputs */
--radius-md: 6px;      /* Buttons */
--radius-lg: 8px;      /* Cards */
--radius-xl: 16px;     /* Modals */
--radius-2xl: 24px;    /* Large containers */
```

---

## Migration Priority Order

1. **HIGH PRIORITY** (Do First - Week 1)
   - [ ] SKU Performance table (line ~3000)
   - [ ] Update imports in App.tsx
   - [ ] Test in browser

2. **MEDIUM PRIORITY** (Week 2-3)
   - [ ] Portfolio Changes table (line ~3493)
   - [ ] Create reusable Button, Badge, Card components
   - [ ] Training Panel stats styling

3. **LOW PRIORITY** (Week 4+)
   - [ ] Report Modal export styling
   - [ ] Theme switching UI
   - [ ] Advanced customization

---

## Testing Checklist

After each table migration:

- [ ] Table renders without errors
- [ ] Colors match design system in light mode
- [ ] Colors work in dark mode
- [ ] Hover states work
- [ ] Row highlighting works (isHighlighted prop)
- [ ] Export/print CSS works
- [ ] Mobile responsive

---

## If Something Breaks

**Error: "Can't find module"**
```
Make sure you imported the component:
import { Table, TableHeader, TableBody, TableRow, TableCell } from './components/Table';
```

**Colors look wrong**
```
1. Check that DESIGN_SYSTEM_TOKENS.css is imported in index.html
2. Open DevTools → Elements → <html> element
3. Check computed styles for var(--color-*) properties
```

**Theme not switching**
```
We haven't built the theme switcher yet. That's Phase 4.
For now, colors will work in dark mode automatically.
```

---

## Need Help?

Refer to the full migration plan: [MIGRATION_PLAN_DESIGN_SYSTEM.md](MIGRATION_PLAN_DESIGN_SYSTEM.md)

Questions? Check:
1. The design token CSS values in DESIGN_SYSTEM_TOKENS.css
2. The Table component implementation in components/Table.tsx
3. The color token reference above
