---
title: Supply Chain Forecasting Tool — Product Demo & Walkthrough Script
version: 1.0
date: January 2026
---

# Supply Chain Forecasting Tool
## Product Demo Walkthrough Script

### **Demo Duration**: 20-25 minutes (Full) | 10-12 minutes (Executive)

---

## Pre-Demo Setup (5 minutes before)

### **Checklist**
- [ ] Application running: `npm run dev:all` or deployed instance ready
- [ ] Browser open: http://localhost:3001 (or production URL)
- [ ] Sample CSV prepared: "Big Tex Historical Sales.csv" (included in repo)
- [ ] Volume at reasonable level for participant audio
- [ ] Backup: Screenshot folder ready in case of technical issues
- [ ] Second monitor (optional): Have documentation open for Q&A

### **Open in New Incognito/Private Window**
- Clears cache, ensures clean state
- Demonstrates fresh user experience
- Shows how easily anyone can onboard

---

## Script Flow (20-25 minutes)

---

## **SECTION 1: INTRODUCTION & CONTEXT** (2 min)

**OPENING STATEMENT:**
> "Today I'm going to show you how [Company] can move from reactive to predictive supply chain planning. This tool automates demand forecasting, inventory optimization, and portfolio analysis — three things that today probably take your team 40+ hours per month.
>
> Here's the workflow: We upload historical sales data, the system automatically generates forecasts using multiple methods, and then we use that to plan production, manage inventory risk, and optimize our SKU portfolio. Let's walk through it."

**KEY POINTS TO EMPHASIZE:**
- Reduces planning cycle from monthly to on-demand (daily if needed)
- Gives visibility to inventory risk before stockouts happen
- Combines statistical forecasting with machine learning for higher accuracy
- Works with data you already have (ERP exports)

**OPTIONAL CONTEXT:**
- "If you're familiar with demand planning tools like Anaplan or Logility, this gives you that visibility at a fraction of the cost and complexity."
- "The key difference is we're using 5 different forecasting approaches and letting the system choose the best one for each product family based on historical accuracy."

---

## **SECTION 2: DATA UPLOAD** (1.5 min)

### **Navigate to "Future" Tab**

**SHOW ON SCREEN:**
- Click the **"Future"** tab in the left navigation
- Point out the 5 main tabs: Future | Financials | Quality | Inventory | Sandbox

**EXPLAIN:**
> "The 'Future' tab is where we do demand forecasting. Everything starts with data — in this case, we're uploading 36 months of historical sales by SKU."

### **Upload Sample CSV**

**CLICK:** "Upload CSV" button (or drag-and-drop zone)

**SELECT FILE:** `Big Tex Historical Sales.csv` (or your sample)

**WAIT FOR UPLOAD** (should complete in <5 seconds)

**SHOW ON SCREEN AFTER UPLOAD:**
- "Data loaded successfully" message
- Row count (e.g., "2,412 records aggregated")
- Unique SKUs detected (e.g., "47 SKUs found")
- Date range (e.g., "Jan 2022 - Dec 2024")

**TALKING POINTS:**
- "The system auto-detected the CSV headers — no manual schema mapping needed."
- "Behind the scenes, we're grouping this data by SKU and month, reducing 2,400 rows to 47 SKUs × 36 months for forecasting."
- "The system also auto-detects date formats, so whether your ERP exports M/D/YYYY or YYYY-MM-DD, it just works."

---

## **SECTION 3: FORECASTING METHOD SELECTION** (2.5 min)

### **Show Forecast Method Selector**

**EXPLAIN THE 4 METHODS:**

Scroll to show the "Forecasting Method" dropdown

**HOLT-WINTERS** (Default - Click to select if not already)
> "This is our default. It's perfect for consumer goods and electronics — products with seasonal patterns. It assumes demand will follow historical seasonality and adjust for trends."

**PROPHET** (Click)
> "Prophet is built by Facebook and handles disruptions really well. It's great for products affected by external events — like if you had a promotion or supply shock. Notice it automatically breaks the forecast into trend and seasonal components."

**ARIMA** (Click)
> "ARIMA is the statistical gold standard — auto-regressive integrated moving average. Use this when you have high-volume products with consistent demand. It's mathematically rigorous but assumes no major disruptions."

**LINEAR REGRESSION** (Click)
> "This is our baseline — just a trend line. If your product is growing or declining steadily, this shows that. It's simple but surprisingly effective for commodities or new products."

### **Set Forecast Horizon**

**DRAG SLIDER** from 12 to 24 months (or leave at default)

**EXPLAIN:**
> "Here we're saying 'show me the next 24 months of demand.' The further out we go, the wider the confidence intervals get — because there's more uncertainty. Notice how the gray bands get wider at the right side of the chart."

**POINT TO CONFIDENCE INTERVALS:**
- Blue line = most likely forecast
- Gray bands = 95% confidence interval ("We're 95% confident actual demand will fall between these bands")
- Darker area near now = historical data (what actually happened)

### **Run Forecast**

**CLICK:** "Generate Forecast" button

**WAIT** for calculation (typically <2 seconds)

**TALKING POINTS WHILE WAITING:**
- "Behind the scenes, we're running this same forecast with 4 different methods and comparing them. The system learns which method works best for each product family based on historical accuracy."
- "That's the benefit of this approach — it's not 'one size fits all.' We adapt to each product's unique characteristics."

---

## **SECTION 4: FORECAST RESULTS & INTERPRETATION** (3 min)

### **Show Forecast Chart**

**EXPLAIN THE CHART:**
- **X-axis**: Time (history on left, forecast on right)
- **Y-axis**: Demand quantity
- **Dark line**: Historical demand
- **Blue line**: Forecast
- **Gray bands**: Confidence intervals
- **Red dots** (if shown): Anomalies detected (unusual spikes/drops)

**POINT OUT KEY FEATURES:**

1. **Seasonal Pattern** (if visible)
   > "See how demand peaks in certain months? That's the seasonal pattern. The forecast captures that and projects it forward."

2. **Trend** (if visible)
   > "You can see demand is trending [up/down/stable]. That's baked into our forecast. We're not assuming the future will be exactly like the past — we're adjusting for trends."

3. **Confidence Intervals**
   > "These gray bands are really important. They tell us the range where we should expect demand. Wider bands = more uncertainty. We'll use these for safety stock calculations."

### **Toggle Between Methods** (Optional - Only if Time Allows)

**CLICK** on Holt-Winters in legend, then Prophet, then ARIMA

**EXPLAIN DIFFERENCES:**
- "Notice how Prophet captures the trend differently?"
- "ARIMA is more conservative — narrower confidence intervals."
- "That's why we blend them together — each method has strengths, and the ensemble gives us the best of all worlds."

### **Show Forecast Accuracy Metrics** (if visible)

**POINT TO:**
- MAE (Mean Absolute Error)
- RMSE (Root Mean Squared Error)
- MAPE (Mean Absolute Percentage Error)

**EXPLAIN:**
> "These numbers tell us how accurate each method was on historical data. If MAPE is 12%, that means on average the forecast was off by 12%. We use these metrics to weight which method to trust more for the future."

---

## **SECTION 5: INVENTORY PLANNING** (3 min)

### **Navigate to "Inventory" Tab**

**CLICK:** Inventory tab

**EXPLAIN:**
> "Now we take that forecast and use it for inventory planning. We upload your current stock levels and any scheduled production orders, and the system tells you exactly when you're going to run out."

### **Upload/Show Current Inventory** (if not pre-loaded)

**LOOK FOR:**
- Current On-Hand inventory by SKU
- Last Updated date

**TALKING POINTS:**
- "This tells the system where we're starting from."
- "In your ERP, you'd pull this from the inventory balance report."

### **Show Safety Stock Calculation**

**POINT TO SAFETY STOCK SECTION:**

**EXPLAIN THE FORMULA:**
> "Safety Stock = Z-Score × Demand Std Dev × √(Lead Time)"
>
> "Translation: The higher your service level target (95% vs 90%), the longer your supplier's lead time, and the more variable your demand — the more safety stock you need to buffer against stockouts."

**SHOW EXAMPLE:**
- Service Level: 95% (we're 95% confident we won't stock out)
- Lead Time: 30 days (how long until the next shipment arrives)
- Current On-Hand: 5,000 units
- Forecast Demand: 8,000 units/month
- **Result**: Safety Stock = 2,200 units | Reorder Point = 10,200 units

**INTERPRETATION:**
> "This says: when your inventory drops to 10,200 units, order now. You'll have enough to cover the 30-day lead time plus a buffer in case demand spikes."

### **Show Depletion Projection Chart**

**LOOK FOR:** Projected inventory line overlaid on forecast

**POINT OUT:**
- Green area = Safe zone (above safety stock)
- Yellow area = Warning zone (approaching safety stock)
- Red area = Critical (below safety stock — stockout risk)

**EXPLAIN:**
> "This chart shows us month-by-month what our inventory will look like if we follow the forecast. Any red zone means we need to schedule production or rush an order BEFORE it happens."

### **Show Alerts** (if any)

**POINT TO:** Alert panel (if visible)

**EXPLAIN EACH ALERT TYPE:**
1. **Stockout Alert** (Critical): Projected inventory goes negative
2. **Safety Stock Alert** (Warning): Projected inventory below target

**EXAMPLE ALERT:**
> "SKU-101: Projected stockout on March 15. Demand expected: 2,500 units. Current on-hand: 1,800 units. Recommendation: Schedule production for at least 1,200 units by March 1."

---

## **SECTION 6: PORTFOLIO ANALYSIS** (3 min)

### **Navigate to "Sandbox" Tab**

**CLICK:** Sandbox tab

**EXPLAIN:**
> "Now let's step back and look at your entire portfolio. Which SKUs are your workhorses? Which ones are volatile and risky? Which ones are shifting in importance? That's what the Sandbox analytics show us."

### **Show ABC Portfolio Transformation Matrix**

**LOOK FOR:** 3-column visualization (Historical | Category Shifts | Forecasted)

**EXPLAIN EACH COLUMN:**

**LEFT COLUMN (Historical):**
- Stacked bar showing your past portfolio
- Class A (Indigo): Top 80% of volume — your revenue drivers
- Class B (Orange): Next 15% of volume — important but not critical
- Class C (Slate): Bottom 5% — long tail, many SKUs

**MIDDLE COLUMN (Shifts):**
- Badges showing which SKUs are moving between classes
- A→B (Red): Revenue driver becoming less important
- C→A (Green): Long-tail product becoming a star
- No Change: Stable products

**RIGHT COLUMN (Forecasted):**
- Projected portfolio mix for the forecast period
- Shows how your business is shifting

**TALKING POINTS:**
> "This is crucial for supply chain planning. If we're moving resources from Class A to Class B, that changes your production schedule. If Class C products are becoming A, you need to invest in their supply chain."

### **Show SKU Volatility Chart**

**LOOK FOR:** Horizontal bar chart comparing Historic vs Projected demand variation

**EXPLAIN:**
> "Volatility is demand unpredictability. High volatility = we need larger safety stocks. Low volatility = we can be leaner."

**POINT OUT:**
- Red bars (High volatility >50%): Unpredictable — need safety stock cushion
- Orange bars (Medium 30-50%): Moderate — normal planning
- Blue bars (Low <30%): Stable — can run leaner inventory

**EXAMPLE:**
> "See SKU-101? It has 45% volatility — that's moderate. But look at SKU-050 — only 8% volatility. Completely stable. We could run 50% less safety stock for 050 compared to 101."

### **Show Consolidated Analytics Table**

**LOOK FOR:** 6-column table with SKU | ABC | Volatility | Risk | ABC Change | Volatility Change

**EXPLAIN EACH COLUMN:**
- **SKU**: Product identifier
- **ABC**: Current classification (A/B/C)
- **Volatility %**: Demand variation (lower is more predictable)
- **Risk**: High/Medium/Low based on volatility
- **ABC Change**: Whether it's shifting classes (with arrow indicator)
- **Volatility Change**: Whether it's becoming more/less stable

**TALKING POINTS:**
> "This table is your action list. SKUs moving from A→B need to be deprioritized. High-volatility products need safety stock investment. Stable products can free up working capital."

---

## **SECTION 7: FORECAST ACCURACY & CONTINUOUS IMPROVEMENT** (2 min)

### **Navigate to "Quality" Tab**

**CLICK:** Quality tab

**EXPLAIN:**
> "Here's where we validate how well our forecasts actually work. We backtest each method against real historical data to see which one would have been most accurate."

### **Show Accuracy Metrics**

**LOOK FOR:** Backtest results table

**POINT OUT:**
- **MAE (Mean Absolute Error)**: On average, how many units off? (Lower = better)
- **RMSE (Root Mean Squared Error)**: Penalizes big misses more — good for safety stock
- **MAPE (Mean Absolute Percentage Error)**: Percentage error — what to communicate to the business

**EXAMPLE:**
> "If MAPE is 12%, it means our forecast is off by 12% on average. For a product with 10,000 unit/month demand, that's ±1,200 units of uncertainty. That's what we build safety stock around."

### **Show Method Comparison**

**IF VISIBLE:** Bar chart comparing all 4 methods

**EXPLAIN:**
> "This backtest tells us: if we used Prophet for this product family, we'd be off by X%. If we used Holt-Winters, we'd be off by Y%. We use this to weight which method to trust more going forward."

**KEY MESSAGE:**
> "The beauty of this tool is it learns. Every month when you upload new actuals, the accuracy metrics update, and the system adapts which forecast method to weight more heavily. It's continuously getting smarter."

---

## **SECTION 8: FINANCIAL INTEGRATION** (1.5 min) (Optional - Executive Track)

### **Navigate to "Financials" Tab** (Briefly)

**CLICK:** Financials tab

**EXPLAIN:**
> "Finally, we connect this to your production and financial planning. You upload your production orders and open POs, and we show you the financial impact."

### **Show Production Plan Integration**

**POINT TO:**
- Production orders by date
- Open POs by date
- How they're factored into inventory projections

**EXAMPLE:**
> "We have 1,000 units of SKU-101 arriving March 15. The system knows this and doesn't flag a stockout on March 10 because the replenishment is coming."

### **Show Cost Scenario Modeling** (if time)

**EXPLAIN:**
> "You can also model cost scenarios: 'What if lead times increased to 45 days?' or 'What if we wanted 98% service level instead of 95%?' The system recalculates safety stock and working capital impact in real-time."

---

## **SECTION 9: EXPORT & HANDOFF** (1 min)

### **Show Export Buttons** (Point out, don't necessarily click)

**EXPLAIN EXPORT OPTIONS:**

1. **Forecast CSV**: All SKUs, all months, with confidence intervals
   > "You'd take this and load it into your S&OP system or production planning tool."

2. **Inventory Alerts CSV**: Flagged SKUs with stockout dates and recommended actions
   > "This goes to your procurement team so they know which orders to place and when."

3. **Volatility & Portfolio Mix CSV**: ABC shifts, volatility rankings, risk levels
   > "This goes to your finance and portfolio management team for strategic decisions."

4. **Backtest Results CSV**: Accuracy metrics by method, SKU, and period
   > "You keep this for compliance/governance so you can show how the forecast was calculated."

**TALKING POINT:**
> "All exports are timestamped so you have a full audit trail of what was forecasted when."

---

## **SECTION 10: IMPLEMENTATION SUMMARY** (1-2 min)

### **Recap the Workflow**

> "Here's what we just walked through:
> 1. **Upload** historical sales from your ERP (36 months minimum)
> 2. **Forecast** using multiple methods — the system automatically picks the best one for each product
> 3. **Plan** inventory based on the forecast and your service level targets
> 4. **Monitor** for stockout risks and safety stock breaches
> 5. **Analyze** your portfolio to understand which products are driving value
> 6. **Validate** forecast accuracy and continuously improve
> 7. **Export** and integrate with your production and financial systems"

### **Key Benefits Summary**

**QUICK WINS (Week 1-2):**
- Reduce planning cycle time by 30-40%
- Eliminate spreadsheet errors in forecast calculations
- Immediate visibility to inventory risks

**MEDIUM-TERM (Month 1-2):**
- Reduce safety stock by 10-15% while maintaining service levels
- Improve forecast accuracy to <12% MAPE
- Better cross-functional alignment on demand

**LONG-TERM (Quarter 1+):**
- Increase inventory turns by 10-15%
- Free up 5-8% of working capital
- Data-driven portfolio optimization

---

## **Q&A ANTICIPATED QUESTIONS & ANSWERS**

### **Q: How much historical data do we need?**
**A:** Minimum 24 months, ideally 36 months. If you have more, that's great — we'll use it. If you have less (like new products), we can blend this forecast with expert judgment.

### **Q: What if our data is dirty or has gaps?**
**A:** The system is forgiving. It auto-normalizes dates, handles missing values gracefully, and flags anomalies so you can decide whether they're real or data errors. We can also hand-clean before upload if needed.

### **Q: How often do we need to re-run forecasts?**
**A:** As often as you like. Many clients run weekly. The system is fast — you can upload new data and have updated forecasts in <2 minutes. We recommend monthly for S&OP, weekly for tactical adjustments.

### **Q: What if our demand is unpredictable (e.g., project-based orders)?**
**A:** That's where the volatility analysis helps. If a SKU is truly unpredictable, the system will flag it as High Risk and recommend higher safety stock or shorter lead times. For project-based, you might manually override — we can do that.

### **Q: How does this integrate with our ERP/systems?**
**A:** Via CSV import/export today. Near-term, we can build API integrations to pull directly from SAP, Oracle, or NetSuite, and push forecasts back automatically.

### **Q: What about machine learning — how much does that improve accuracy?**
**A:** For most products, the 4 statistical methods are already 90%+ as good as ML. But ML (XGBoost) learns from features like seasonality strength, trend, volatility, etc., and can add 2-5% accuracy improvement. It's especially powerful when you have 50+ SKUs and 36+ months of history.

### **Q: Who needs to use this? Do we need to retrain our team?**
**A:** Designed for Demand Planners, Supply Chain Managers, and Operations teams. Minimal training — if you can upload a CSV and read a chart, you're good. We provide 1-2 hour onboarding.

### **Q: What's the cost? How does licensing work?**
**A:** [Insert your pricing model — e.g., SaaS monthly, per-SKU, enterprise flat fee, etc.]

### **Q: Can we try it with our real data?**
**A:** Absolutely. We can set up a pilot with your top 20 SKUs or highest-revenue product family. Typical pilot is 2-3 weeks to validate accuracy, then we expand.

---

## **CLOSING STATEMENT** (30 seconds)

> "What you're looking at is enterprise demand planning that used to require a $500K software implementation, $100K+/year support, and 6+ months to deploy. This gets you there in weeks, with data you already have, at a fraction of the cost.
>
> The real value isn't just the forecast — it's the continuous learning, the cross-functional visibility, and the ability to act on inventory risk before it becomes a problem.
>
> [NEXT STEP]: Let's schedule a pilot with your [Product Family] data. We can have validated forecasts for you within 2 weeks. Sound good?"

---

## **DEMO VARIATIONS**

### **Executive Track** (10-12 minutes)
- Skip: Technical details, confidence interval math, advanced chart features
- Focus: Business outcomes, portfolio shifts, cost/working capital impact
- Sections: 1, 3 (brief), 6, 9, 10

### **Operations/Demand Planning Track** (20-25 minutes)
- Full walkthrough as described above
- Emphasize: Inventory alerts, safety stock calculations, forecast accuracy
- Add discussion of: Data quality, integration points, weekly vs. monthly cadence

### **Finance/CFO Track** (15-18 minutes)
- Focus: Working capital impact, safety stock optimization, accuracy ROI
- Sections: 1, 3 (brief), 5 (inventory), 6, 8 (financials), 10
- Talking point: "Every 1% reduction in safety stock = $X working capital freed up"

### **Technical/IT Track** (25-30 minutes)
- Include: Architecture diagram, API endpoints, data flow, integration options
- Sections: 1, 2, 3, 5, 9, 10 + deep-dive Q&A
- Provide: Integration guide, API documentation, sample payloads

---

## **TIPS FOR SMOOTH DELIVERY**

✅ **DO:**
- Speak to the problem first ("Your team spends 40 hours/month on this...") before showing the solution
- Let the demo breathe — pause between sections to check for questions
- Use real data (their data or realistic sample data) — don't use fake numbers
- Point to specific areas on screen — don't describe ("See here on the left..." vs. "There's a button")
- Have a backup: If a chart doesn't load, have a screenshot ready

❌ **DON'T:**
- Assume they understand forecasting terminology — explain MAE, MAPE, etc. in plain English
- Overwhelm with options — focus on the default, happy-path workflow
- Over-script — read from talking points, not word-for-word
- Rush — this should feel conversational, not like a lecture
- Go into the ML details unless they ask — "It learns which method works best" is usually enough

---

## **TIMING CHECKLIST**

| Section | Time | Cumulative |
|---------|------|-----------|
| Intro | 2 min | 2 min |
| Upload | 1.5 min | 3.5 min |
| Forecasting | 2.5 min | 6 min |
| Results | 3 min | 9 min |
| Inventory | 3 min | 12 min |
| Portfolio | 3 min | 15 min |
| Quality | 2 min | 17 min |
| Financials | 1.5 min | 18.5 min |
| Export | 1 min | 19.5 min |
| Summary | 1 min | 20.5 min |
| **Total** | | **~21 min** |

*Add 5-10 min for Q&A, depending on audience engagement.*

---

## **POST-DEMO FOLLOW-UP**

After the demo, send them:
1. **One-pager** (OPERATING_CADENCE_ONEPAGER.md) — Shows integration into their workflow
2. **Data upload template** — Sample CSV in their expected format
3. **Pilot proposal** — 2-week timeline, success criteria, deliverables
4. **Technical guide** — For their IT team (SYSTEM_PROMPT_FOR_AI.md summary)
5. **Calendar invite** — Next steps meeting within 48 hours

---

**Script prepared for: [Your Name] | [Date]**  
**Contact for Q&A: [Your Contact Info]**
