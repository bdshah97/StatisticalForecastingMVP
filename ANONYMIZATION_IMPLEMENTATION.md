# SKU Anonymization Implementation - Complete

## What Was Implemented

All SKU data sent to external LLM services is now anonymized before transmission and de-anonymized upon return.

### 1. **Anonymization Helpers** (aiService.ts)
```typescript
// Send to LLM: Real SKU → Anonymous ID
anonymizeData(text, mapping)  // "PROD-ABC-123" → "SKU-001"

// Return from LLM: Anonymous ID → Real SKU
deanonymizeData(text, mapping)  // "SKU-001" → "SKU-001 (PROD-ABC-123)"
```

### 2. **SKU Mapping Created** (App.tsx)
```typescript
const skuAnonymizationMap = useMemo(() => {
  // Creates mapping: SKU-001 → PROD-ABC-123, SKU-002 → PROD-XYZ-789, etc.
  // Stays in browser only, never sent to LLM
}, [paretoResults]);
```

### 3. **Transmission Flow**

**Chat Agent (Already Protected):**
```
✅ AI Context: All portfolio data sent with SKU-001, SKU-002, etc.
✅ User Question: "Which SKUs need attention?"
✅ AI Response: "SKU-001 and SKU-003 show high volatility"
✅ Frontend Translation: "SKU-001 (PROD-ABC-123) and SKU-003 (PROD-XYZ-789) show high volatility"
```

**Narrative Summary (Now Protected):**
```
✅ Before: getNarrativeSummary(..., ["PROD-ABC-123", "PROD-XYZ-789"])  ← Real SKUs exposed!
✅ After:  getNarrativeSummary(..., ["PROD-ABC-123"], skuAnonymizationMap)
           → Internally maps to ["SKU-001"]
           → Sends to AI: "mention 2 specific SKUs from [SKU-001]"
           → AI Response: "SKU-001 needs attention"
           → Translate back: "SKU-001 (PROD-ABC-123) needs attention"
```

### 4. **Protected Functions**

| Function | Status | What's Anonymized |
|----------|--------|-------------------|
| **Chat Agent** | ✅ | All SKU references |
| **getNarrativeSummary** | ✅ | SKU names in prompt |
| **deanonymizeData** | ✅ | Responses contain `SKU-001 (RealName)` |

### 5. **Data That Stays Anonymous**

When sending to LLMs, all SKUs are represented as:
- `SKU-001`, `SKU-002`, `SKU-003`, ... `SKU-999+`
- Mapping exists only in browser state (`skuAnonymizationMap`)
- Real SKU names **never** transmitted to external services

### 6. **User Experience**

Users see full transparency with both IDs:
```
Chat Response: "Focus on SKU-001 (PROD-ABC-123) and SKU-042 (PROD-XYZ-789) 
               for highest volatility reduction..."
```

---

## Security Impact

| Threat | Before | After |
|--------|--------|-------|
| Company identification via SKU names | 🔴 HIGH RISK | ✅ PROTECTED |
| Real product data exposed | 🔴 HIGH RISK | ✅ PROTECTED |
| Portfolio analysis from SKUs | 🔴 HIGH RISK | ✅ PROTECTED |
| Reverse engineering products | 🔴 MEDIUM RISK | ✅ PROTECTED |

---

## Code Changes Summary

1. **aiService.ts:**
   - Added `anonymizeData()` function
   - Added `deanonymizeData()` function
   - Updated `getNarrativeSummary()` to accept optional `skuMapping` parameter
   - Anonymizes SKU list before sending to AI

2. **App.tsx:**
   - Added `skuAnonymizationMap` useMemo hook
   - Imported `deanonymizeData` from aiService
   - Updated getNarrativeSummary calls to:
     - Pass `skuAnonymizationMap`
     - De-anonymize response before displaying

3. **ChatAgent.tsx:**
   - Already had de-anonymization logic in place
   - Displays both anonymous ID and real name: `SKU-001 (PROD-ABC-123)`

---

## Testing Checklist

- [x] Build compiles without errors
- [x] SKU mapping created correctly (SKU-001, SKU-002, etc.)
- [x] Mapping passed to AI functions
- [x] Responses properly de-anonymized
- [x] User sees both ID and real SKU name

---

## Privacy Result

✅ **All sensitive SKU data is protected**
- Real SKU names never leave the browser
- External LLMs only see anonymized IDs (SKU-001, etc.)
- Users maintain full context with de-anonymized responses
- No change to functionality or UX
- No security tokens/API keys exposed (deleted in GitHub)

