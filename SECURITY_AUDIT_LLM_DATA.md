# LLM Data Security Audit

## Executive Summary
The application sends data to external LLM services in 8 different scenarios. With the recent SKU anonymization implementation, most data is now protected. However, several vectors still require attention.

---

## Data Flow Analysis

### 1. **Chat Agent (getChatResponse)** ✅ PROTECTED
**Location:** `App.tsx:3331` → `ChatAgent.tsx` → `aiService.ts:318`

**Data Sent:**
```typescript
{
  aiContext: "PORTFOLIO SNAPSHOT... ALL SKU DETAILS (Anonymized): SKU-001, SKU-002..."
  userMessage: User query
  messageHistory: Conversation history
  audience: User role (e.g., "Plant Manager")
}
```

**Security Status:** ✅ SAFE
- SKU names are anonymized (SKU-001, SKU-002, etc.)
- Real SKU mapping stays in browser only (`skuAnonymizationMap`)
- Frontend de-anonymizes responses before display
- **However:** Full portfolio metrics (volume, volatility) are exposed for all SKUs

**Risk:** Medium
- Volumes and volatility patterns could reveal competitive position
- Total SKU count exposed
- Metrics could be reverse-engineered to identify SKUs

---

### 2. **Industry Insights (getIndustryInsights)** ⚠️ EXPOSED
**Location:** `App.tsx:2132`

**Data Sent:**
```typescript
{
  prompt: committedSettings.industryPrompt          // User's industry prompt
  statsSummary: `Avg: ${Math.round(stats.avg)}. Accuracy: ${accuracy}%`
}
```

**Security Status:** ⚠️ PARTIAL RISK
- Industry prompt is user-generated (could contain competitive info)
- Average demand volume is exposed
- Forecast accuracy exposed
- No SKU identification here (good)

**Risk:** Low-Medium
- Industry context could help identify company
- Volume data reveals scale of operations
- Accuracy metric could reveal forecast capabilities

---

### 3. **Narrative Summary (getNarrativeSummary)** ⚠️ EXPOSED
**Location:** `App.tsx:2133`, `App.tsx:1578`

**Data Sent:**
```typescript
{
  prompt: committedSettings.industryPrompt          // e.g., "Medical Device Manufacturing"
  historicalAvg: stats.avg                          // Actual avg volume
  forecastAvg: calculated average                   // Actual forecast avg
  horizon: committedSettings.horizon                // Forecast period (e.g., 12 months)
  audience: committedSettings.audience              // User role
  skus: committedSettings.filters.skus              // ⚠️ REAL SKU NAMES!
}
```

**Security Status:** ⚠️ HIGH RISK
- **CRITICAL:** Real SKU names are passed in the `skus` array
- Volumes are not anonymized (actual historical and forecasted values)
- Trend direction exposed
- Could identify company + products

**Risk:** HIGH
- Real SKU names + volumes + trend = company identification
- Competitive intelligence leak
- Multiple data points can triangulate to specific company

**Example Exposure:**
```
"Medical Device Manufacturing industry, SKU: PROD-ABC-2024, 
forecasted 15% growth over next 12 months, avg volume 5,000 units/month"
→ Potentially identifiable to specific competitor
```

---

### 4. **Anomaly Analysis (getAnomalyAnalysis)** ⚠️ EXPOSED
**Location:** `App.tsx:1601`

**Data Sent:**
```typescript
{
  industry: committedSettings.industryPrompt        // e.g., "Medical Device Manufacturing"
  outliers: [                                       // Last 5 demand anomalies
    { date: "2025-12-15", quantity: 8500 },
    { date: "2025-12-08", quantity: 12000 },
    ...
  ]
}
```

**Security Status:** ⚠️ MEDIUM RISK
- Anomalies show actual demand data points
- Time-series patterns could reveal business events
- Industry context helps narrow identification
- No SKU names in outliers (good)

**Risk:** Medium
- Spikes/drops could correlate to public news
- Pattern analysis could identify company
- Volume scale reveals business size

---

### 5. **Methodology Assessment (getMethodologyAssessment)** ⚠️ EXPOSED
**Location:** `App.tsx:2145`

**Data Sent:**
```typescript
{
  selectedMethodName: "ARIMA" | "Exponential Smoothing" | "SARIMA"
  selectedMetrics: {
    accuracy: 87.3,
    mape: 12.5,
    rmse: 450,
    bias: 2.1
  },
  metricsInfo: "- ARIMA: Accuracy 87.3%, MAPE 12.5%, RMSE 450, Bias 2.1%\n- Exponential..."
}
```

**Security Status:** ✅ SAFE
- Only aggregate metrics, not tied to specific products
- Methodology selection is generic
- No volumes or SKU data
- Accuracy/error metrics are non-identifying

**Risk:** Low
- Could reveal forecasting sophistication level
- Helps understand analytical maturity
- Not directly identifying

---

### 6. **One-Pager Report (getOnePagerReport)** ⚠️ EXPOSED
**Location:** `App.tsx:1614`

**Data Sent:**
```typescript
{
  context: `Portfolio Status: ${paretoResults.length} SKUs analyzed, 
            ${futureForecast.length} forecast periods. 
            Forecast methodology: ${committedSettings.filters.methodology}`
  audience: committedSettings.audience
}
```

**Security Status:** ⚠️ MEDIUM RISK
- SKU count exposed (e.g., "1,247 SKUs analyzed")
- Forecast period length exposed
- Methodology exposed
- Audience type exposed

**Risk:** Medium
- SKU count alone can identify company size/category
- Combined with industry, narrows down significantly
- Report format/structure reveals operational maturity

---

### 7. **Market Trend Adjustment (getMarketTrendAdjustment)** ⚠️ EXPOSED
**Location:** Not visible in current grep but called during analysis

**Data Sent:**
```typescript
{
  prompt: committedSettings.industryPrompt          // e.g., "Medical Device Manufacturing"
  // Uses Google Search API
}
```

**Security Status:** ✅ SAFE (specific to Gemini)
- Only sends industry prompt to public search
- No proprietary data
- Search results are public anyway
- Google has separate privacy policies

**Risk:** Low
- Industry context is user-controlled
- No company-specific data included
- Same as public web search

---

### 8. **API Key Exposure** 🔴 CRITICAL RISK
**Location:** `services/aiService.ts:32-34, 46-48, 96-97`

**Issue:**
```typescript
const apiKey = (process.env as any).OPENAI_API_KEY;
const apiKey = (process.env as any).ANTHROPIC_API_KEY;
const apiKey = process.env.API_KEY;  // Gemini
```

**Security Status:** 🔴 CRITICAL
- API keys from environment variables accessed in browser code
- This means API keys are bundled in built bundle if not stripped
- Vite build processes environment variables

**Risk:** CRITICAL
- If API keys are exposed in bundle, attacker can make unlimited API calls
- Attacker can intercept/read all data sent to LLMs
- Billing fraud potential
- Data breach amplifier

**Required Fix:**
```typescript
// API keys should NEVER be in browser code
// Must use backend proxy:
// Frontend → Your Server → LLM
// OR
// Use API key management service (AWS Secrets Manager, etc.)
```

---

## Summary Table

| Function | Data Exposed | SKU Names | Volumes | Risk | Fix |
|----------|-------------|-----------|---------|------|-----|
| **Chat Agent** | Metrics, Context | ✅ Anon | Actual | Medium | ✓ OK (keep as-is) |
| **Industry Insights** | Industry, Avg Vol, Accuracy | ❌ None | Avg Only | Low-Med | Anonymize avg |
| **Narrative Summary** | Industry, Vols, SKU Names | ❌ REAL | Actual | 🔴 HIGH | **FIX REQUIRED** |
| **Anomaly Analysis** | Industry, Outlier Vols | ❌ None | Actual | Medium | Anonymize vols |
| **Methodology Assessment** | Metrics | ❌ None | None | Low | ✓ OK |
| **One-Pager Report** | SKU Count, Methodology | ❌ None | Count Only | Medium | ✓ Acceptable |
| **Market Trends** | Industry | ❌ None | None | Low | ✓ OK |
| **API Keys** | Everything | N/A | N/A | 🔴 CRITICAL | **FIX REQUIRED** |

---

## Critical Issues (Requires Immediate Action)

### 🔴 Issue #1: Real SKU Names in getNarrativeSummary
**Severity:** CRITICAL

**Problem:**
```typescript
const skuPrompt = isNonExec 
  ? `You MUST include a mention of 2 specific SKUs from this list [${skus.slice(0, 5).join(', ')}]...`
```
Real SKU names from `committedSettings.filters.skus` are sent directly to AI.

**Fix Required:**
```typescript
// Map real SKU names to anonymous IDs before sending
const anonSkus = skus.map((sku, idx) => `SKU-${String(idx + 1).padStart(3, '0')}`);
const skuPrompt = isNonExec 
  ? `You MUST include a mention of 2 specific SKUs from this list [${anonSkus.slice(0, 5).join(', ')}]...`
```

---

### 🔴 Issue #2: API Keys in Browser Bundle
**Severity:** CRITICAL

**Problem:**
```typescript
const apiKey = (process.env as any).OPENAI_API_KEY;  // Accessible in browser!
```

**Why It's Dangerous:**
1. If `.env` values aren't stripped during build, they're in `dist/assets/*.js`
2. Attacker can read bundle, extract keys
3. Can make unlimited API calls at your expense
4. Can intercept/decrypt your data

**Verification:**
```bash
# Check if keys are in build output
grep -r "sk-" dist/assets/  # OpenAI key pattern
grep -r "claude" dist/assets/  # Claude key pattern
```

**Fix Required:**
Create a backend proxy instead:
```typescript
// Frontend code
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({ prompt, context })
});

// Backend (Node.js/Python)
// Only backend has actual API keys
// Validate input before forwarding to LLM
```

---

## Recommended Actions (Priority Order)

### Priority 1: API Key Security 🔴
1. **Create backend endpoint** (or use Vercel functions/AWS Lambda)
   - Moves API keys server-side
   - Backend validates input before calling LLM
   - Frontend calls backend instead of LLM directly
   
2. **Verify current build** 
   ```bash
   unzip dist/assets/*.js | strings | grep -i "openai\|anthropic\|gemini"
   ```
   If keys appear → immediate risk

---

### Priority 2: Anonymize SKU Data in getNarrativeSummary 🟡
1. Create anonymization layer for narrative functions
2. Map `committedSettings.filters.skus` to `SKU-001`, `SKU-002`, etc.
3. Same de-anonymization pattern as chat agent

---

### Priority 3: Consider Aggregated Data 🟡
For functions like `getIndustryInsights` and `getAnomalyAnalysis`:
- Send only aggregate stats, not individual data points
- Instead of actual volumes, send ranges ("5K-10K units")
- Remove time-series outlier data, send only summaries

---

## Data Privacy Compliance Check

| Regulation | Status | Notes |
|-----------|--------|-------|
| GDPR | ⚠️ | Sending data to US-based LLMs may violate GDPR. Requires Data Processing Agreement. |
| CCPA | ⚠️ | California residents: data being sent to 3rd parties (Claude, OpenAI, Google). Requires disclosure. |
| NDA/Contracts | 🔴 | If data is covered by NDAs, you may violate them by sharing with LLM providers. |
| SOC 2 | 🟡 | LLM providers have SOC 2 but may retain data for training (check terms). |

---

## Recommendations Summary

✅ **Keep (Already Anonymized):**
- Chat agent with SKU-001 format

⚠️ **Fix (High Priority):**
- API key exposure → move to backend
- getNarrativeSummary → anonymize SKU names

🟡 **Improve (Medium Priority):**
- Reduce granularity of outlier data in anomaly analysis
- Consider sending aggregates instead of individual metrics

---

## Testing Checklist

- [ ] Verify API keys NOT in `dist/assets/` bundle
- [ ] Confirm SKU-XXX format used in all LLM payloads
- [ ] Test de-anonymization on chat responses
- [ ] Audit what data appears in LLM API logs (request with provider)
- [ ] Review data retention policies with Claude/OpenAI/Google
- [ ] Implement backend proxy for API calls
