# Design System Migration Plan
## SSA-theme-shadcn → React Implementation

**Document Version:** 1.0  
**Date:** February 20, 2026  
**Status:** Ready for Implementation  

---

## Executive Summary

This plan outlines the migration from hardcoded Tailwind classes to a cohesive design system extracted from the Penpot `SSA-theme-shadcn 1.pen` file. The system supports:

- ✅ Light/Dark theme switching
- ✅ 5 base color schemas (Neutral, Gray, Slate, Stone, Zinc)
- ✅ 6 accent color options (Red, Rose, Orange, Green, Blue, Violet)
- ✅ Comprehensive component library (buttons, badges, sidebars, tables, inputs, etc.)
- ✅ CSS custom properties for runtime theme switching

---

## Part 1: Current State Analysis

### Existing Table Implementations

**Tables Found in Codebase:**

| Location | Table Name | Purpose | Current Styling |
|----------|-----------|---------|-----------------|
| App.tsx:3000-3020 | SKU Performance | Worst performing SKUs | Hardcoded slate colors |
| App.tsx:3493 | Portfolio Changes | Category transformation | Hardcoded slate colors |
| TrainingPanel.tsx | Data Aggregation Stats | ML training stats | Grid layout hardcoded |
| ReportModal.tsx | Various data tables | Report generation | Hardcoded light/dark |

### Current Color Palette Issues

```tsx
// BEFORE: Hardcoded Tailwind classes scattered throughout
<th className="text-left py-3 px-4 font-black text-slate-300 uppercase tracking-widest">SKU</th>
<td className="py-3 px-4 font-black text-indigo-400">{sku.sku}</td>
<tr className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">

// Color inconsistencies:
- slate-300, slate-400, slate-700, slate-900 (inconsistent grays)
- indigo-400, indigo-600 (one-off accent colors)
- red-400, red-500 (error colors not standardized)
- No dark mode consideration for light theme export
```

### Issues with Current Approach

1. **No centralized theme control** - Colors scattered across 3,500+ lines
2. **Export problems** - Print styles don't respect theme (see ReportModal CSS overrides)
3. **Accessibility gaps** - No semantic color naming (warning, success, error)
4. **Inconsistent spacing** - Custom padding/margins instead of design tokens
5. **Hard to customize** - Changing brand colors requires find-replace across files

---

## Part 2: Design System Architecture

### File Structure

```
c:\Users\bshah\Downloads\Supply-Chain-Forecasting-Tool-main\
├── DESIGN_SYSTEM_TOKENS.css          ← NEW: CSS custom properties
├── components/
│   ├── Table.tsx                     ← NEW: Reusable table component
│   ├── Button.tsx                    ← TODO: Reusable button component
│   ├── Badge.tsx                     ← TODO: Reusable badge component
│   ├── Card.tsx                      ← TODO: Reusable card component
│   └── ...
├── hooks/
│   └── useTheme.ts                   ← TODO: Theme context hook
└── styles/
    └── theme.css                     ← TODO: Theme provider styles
```

### Design Token Categories

#### 1. Color Tokens (Primary)
```css
--color-primary: #0f172a;
--color-primary-foreground: #ffffff;
--color-secondary: #f5f5f5;
--color-secondary-foreground: #171717;
--color-background: #ffffff;
--color-foreground: #171717;

/* Semantic */
--color-success: #059669;
--color-warning: #f97316;
--color-destructive: #de4702;
--color-info: #3b82f6;
```

#### 2. Spacing & Sizing
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 24px;

--radius-sm: 4px;      /* Input fields */
--radius-md: 6px;      /* Buttons */
--radius-lg: 8px;      /* Cards */
--radius-xl: 16px;     /* Modals */
--radius-2xl: 24px;    /* Containers */
--radius-full: 9999px; /* Avatars */
```

#### 3. Typography
```css
--font-family: 'Montserrat', 'Avenir Next LT Pro', sans-serif;
--font-size-xs: 10px;  /* Labels, captions */
--font-size-sm: 12px;  /* Secondary text */
--font-size-md: 14px;  /* Body text */
--font-size-lg: 16px;  /* Headings */
--font-weight-black: 900;
```

#### 4. Theme Variants (Data Attributes)

Light Mode (Default):
```html
<html class="light">
```

Dark Mode:
```html
<html class="dark">
```

Base Color Schema:
```html
<html data-base="slate">    <!-- Current -->
<html data-base="neutral">  <!-- Alternative -->
<html data-base="gray">     <!-- Alternative -->
<html data-base="stone">    <!-- Alternative -->
<html data-base="zinc">     <!-- Alternative -->
```

Accent Color:
```html
<html data-accent="blue">    <!-- Current -->
<html data-accent="violet">  <!-- Alternative -->
<html data-accent="green">   <!-- Alternative -->
```

---

## Part 3: Migration Phases

### Phase 1: Foundation (Week 1)
**Goal:** Establish design system infrastructure

- [x] Create `DESIGN_SYSTEM_TOKENS.css` with all color/spacing tokens
- [x] Create reusable `Table.tsx` component
- [ ] Create `useTheme()` hook for theme context
- [ ] Update `index.html` to import token CSS
- [ ] Document token usage guide

**Deliverables:**
- CSS custom properties file
- Table component with variants
- Theme hook implementation

### Phase 2: Component Library (Week 2-3)
**Goal:** Build reusable components using tokens

Priority Order:
1. `Button.tsx` - Most used component
2. `Badge.tsx` - Status indicators
3. `Card.tsx` - Container patterns
4. `Input.tsx` - Form inputs
5. `Select.tsx` - Multi-select dropdowns
6. `Modal.tsx` - Dialog overlays

Each component should:
- Accept `variant` prop (default, secondary, destructive, etc.)
- Accept `size` prop (sm, md, lg)
- Use CSS custom properties internally
- Support `className` prop for Tailwind overrides

**Example Component:**

```tsx
// AFTER: Using design tokens
const TableCell: React.FC<TableCellProps> = ({ children, isHeader, align }) => {
  return (
    <td
      className={`
        py-3 px-4
        text-[var(--color-foreground)]
        text-[var(--font-size-md)]
        font-[var(--font-weight-normal)]
        text-${align || 'left'}
      `}
    >
      {children}
    </td>
  );
};
```

### Phase 3: Table Migration (Week 3-4)
**Goal:** Replace hardcoded tables with new Table component

Tables to Migrate:

1. **SKU Performance Table** (App.tsx:3000)
   ```tsx
   // BEFORE
   <table className="w-full text-xs">
     <thead>
       <tr className="border-b border-slate-700">
         <th className="text-left py-3 px-4 font-black text-slate-300 uppercase tracking-widest">SKU</th>
   
   // AFTER
   <Table variant="compact">
     <TableHeader>
       <TableRow>
         <TableCell isHeader align="left">SKU</TableCell>
   ```

2. **Portfolio Changes Table** (App.tsx:3493)
   - Update styling to semantic color tokens
   - Replace inline Tailwind with token-based classes

3. **Training Panel Stats** (TrainingPanel.tsx)
   - Standardize box styling
   - Use theme tokens for backgrounds

4. **Report Modal Tables** (ReportModal.tsx)
   - Move print styles to use token colors
   - Support light theme export

### Phase 4: Theme Switching (Week 4)
**Goal:** Implement runtime theme switching

Features:
- [ ] Theme selector dropdown (light/dark + base + accent)
- [ ] LocalStorage persistence
- [ ] System preference detection
- [ ] Smooth transitions between themes
- [ ] Export consistency

```tsx
// Example: Theme Selector Component
<ThemeSelector 
  mode="dark"  // light | dark
  base="slate" // neutral | gray | slate | stone | zinc
  accent="blue" // red | rose | orange | green | blue | violet
/>
```

### Phase 5: Polish & Rollout (Week 5)
**Goal:** QA, documentation, and production deployment

- [ ] Accessibility audit (WCAG AA compliance)
- [ ] Cross-browser testing
- [ ] Mobile theme switching testing
- [ ] Export/print CSS validation
- [ ] Performance metrics (bundle size impact)
- [ ] Migration completion checklist

---

## Part 4: Implementation Examples

### Before → After: SKU Performance Table

**BEFORE:**
```tsx
<table className="w-full text-xs">
  <thead>
    <tr className="border-b border-slate-700">
      <th className="text-left py-3 px-4 font-black text-slate-300 uppercase tracking-widest">SKU</th>
      <th className="text-right py-3 px-4 font-black text-slate-300 uppercase tracking-widest">MAPE</th>
      <th className="text-right py-3 px-4 font-black text-slate-300 uppercase tracking-widest">Accuracy</th>
    </tr>
  </thead>
  <tbody>
    {backtestResults.worstSkus.map((sku, idx) => (
      <tr key={sku.sku} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${idx < 3 ? 'bg-red-500/5' : ''}`}>
        <td className="py-3 px-4 font-black text-indigo-400">{sku.sku}</td>
        <td className="text-right py-3 px-4 font-bold text-red-400">{sku.mape.toFixed(1)}%</td>
        <td className="text-right py-3 px-4 font-bold text-slate-300">{sku.accuracy.toFixed(1)}%</td>
      </tr>
    ))}
  </tbody>
</table>
```

**AFTER:**
```tsx
import { Table, TableHeader, TableBody, TableRow, TableCell } from './components/Table';

<Table variant="compact">
  <TableHeader>
    <TableRow>
      <TableCell isHeader align="left">SKU</TableCell>
      <TableCell isHeader align="right">MAPE</TableCell>
      <TableCell isHeader align="right">Accuracy</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {backtestResults.worstSkus.map((sku, idx) => (
      <TableRow key={sku.sku} isHighlighted={idx < 3}>
        <TableCell className="text-[var(--color-accent)]">{sku.sku}</TableCell>
        <TableCell align="right" className="text-[var(--color-destructive)] font-bold">
          {sku.mape.toFixed(1)}%
        </TableCell>
        <TableCell align="right" className="text-[var(--color-foreground)] font-bold">
          {sku.accuracy.toFixed(1)}%
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Benefits:**
✅ 15 fewer lines of code  
✅ Centralized styling control  
✅ Automatic dark mode support  
✅ Easy theme switching  
✅ Consistent spacing/typography  

---

## Part 5: Migration Checklist

### Pre-Migration
- [ ] Backup current App.tsx
- [ ] Create feature branch: `feature/design-system-migration`
- [ ] Review DESIGN_SYSTEM_TOKENS.css
- [ ] Test Table component in isolation

### Phase 1: Foundation (Week 1)
- [x] Create DESIGN_SYSTEM_TOKENS.css
- [x] Create Table.tsx component
- [ ] Add CSS imports to index.html
- [ ] Create useTheme hook
- [ ] Test token values in browser DevTools

### Phase 2: Components (Week 2-3)
- [ ] Button.tsx (with variants: default, secondary, destructive, outline)
- [ ] Badge.tsx (with variants: default, secondary, success, warning, destructive)
- [ ] Card.tsx (with padding variants)
- [ ] Input.tsx (with focus styles)
- [ ] Select.tsx (multi-select support)
- [ ] Modal.tsx (with backdrop blur)

### Phase 3: Table Migration (Week 3-4)
- [ ] SKU Performance table → Table component
- [ ] Portfolio Changes table → Table component
- [ ] Training Panel stats grid → Card component
- [ ] Report Modal tables → Table component
- [ ] Test export/print CSS

### Phase 4: Theme Switching (Week 4)
- [ ] Create ThemeSelector component
- [ ] Implement useTheme hook
- [ ] Add LocalStorage persistence
- [ ] Test system color scheme detection
- [ ] Test theme switching transitions
- [ ] Validate print styles for all themes

### Phase 5: QA & Rollout (Week 5)
- [ ] Accessibility audit (WCAG AA)
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)
- [ ] Mobile responsiveness check
- [ ] Performance impact test (bundle size)
- [ ] Documentation update
- [ ] Production deployment

---

## Part 6: Token Usage Guide

### In Components

```tsx
// Using CSS custom properties
<div className="text-[var(--color-foreground)] bg-[var(--color-background)]">
  Content here
</div>

// With responsive design
<div className="p-[var(--spacing-lg)] md:p-[var(--spacing-2xl)]">
  Responsive padding
</div>

// Semantic colors
<div className="text-[var(--color-success-foreground)] bg-[var(--color-success)]">
  Success message
</div>
```

### In Tailwind Config (Advanced)

If upgrading to Tailwind CSS v4 with @apply:

```css
@layer components {
  .btn-primary {
    @apply px-6 py-3 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] font-bold transition-all duration-200;
  }
}
```

### Theme Switching

```tsx
// JavaScript
function setTheme(mode, base, accent) {
  document.documentElement.className = mode; // light | dark
  document.documentElement.dataset.base = base;
  document.documentElement.dataset.accent = accent;
  
  // Persist
  localStorage.setItem('theme', JSON.stringify({ mode, base, accent }));
}

// On page load
function restoreTheme() {
  const saved = localStorage.getItem('theme') ? JSON.parse(localStorage.getItem('theme')) : null;
  if (saved) {
    setTheme(saved.mode, saved.base, saved.accent);
  }
}
```

---

## Part 7: Success Metrics

**Completion Criteria:**

| Metric | Target | Status |
|--------|--------|--------|
| Hardcoded colors used in App.tsx | < 10 | 📋 Pending |
| Tables using Table component | 100% | 📋 Pending |
| Design system coverage | 90%+ | 📋 Pending |
| Bundle size impact | < 5KB | 📋 Pending |
| Accessibility score | ≥ 95 | 📋 Pending |
| Export/print CSS passing | 100% | 📋 Pending |

---

## Part 8: Risk Mitigation

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Theme switching breaks print styles | High | Test print CSS thoroughly, maintain fallbacks |
| Performance impact from CSS variables | Medium | Audit critical render path, use will-change sparingly |
| Accessibility regression | High | Run WCAG AA audit on each phase |
| User confusion with new theme selector | Low | Provide clear documentation, default to system preference |
| Breaking changes in ReportModal | High | Create separate branch, test report export thoroughly |

---

## Part 9: Timeline & Ownership

**Estimated Duration:** 5 weeks  
**Parallel Work:** Phases can overlap by 1-2 weeks

### Weekly Sprints

| Week | Objective | Deliverables |
|------|-----------|--------------|
| 1 | Foundation | CSS tokens, Table component, hooks |
| 2-3 | Components | Button, Badge, Card, Input, Select |
| 3-4 | Table Migration | Replace all hardcoded tables |
| 4 | Theme Switching | ThemeSelector, persistence, detection |
| 5 | Polish | QA, docs, production deployment |

---

## Next Steps

1. **Review this plan** with the team (target: today)
2. **Approve design token values** (are the colors correct?)
3. **Create feature branch** and start Phase 1
4. **Daily standups** to track progress
5. **Weekly demos** to stakeholders

---

## Questions & Feedback

- Are the design tokens extracted correctly from Penpot?
- Should we support additional color bases (e.g., Purple, Indigo)?
- Should theme switching be global or per-page?
- Do we need performance optimizations for large datasets?

---

**Document prepared:** February 20, 2026  
**Next review date:** February 27, 2026 (Phase 1 completion)
