# GoGreen CRM - Quick Start Guide

## 🚀 Getting Started

### 1. Apply Database Migration
```bash
cd apps/platform
npx prisma migrate dev --name add_crm_lifecycle
```

### 2. Visit the Pipeline Board
Navigate to: `/admin/pipeline`

You'll see an 8-column Kanban board showing:
- **Cold Leads** → Drag to **Warm Leads** → **Prospects** → **First Booking** → **Active Customer** → **Loyal/VIP** → **Referrer** → **Champion**

### 3. Manage Leads
Visit: `/admin/leads`

Features:
- Filter by lifecycle stage (8 tabs)
- Filter by temperature (Cold/Warm/Hot)
- Create new leads (auto-scored)
- Bulk select and email
- View activity timeline

## 📊 Lead Scoring

Leads are automatically scored 1-100 based on:
- Engagement (calls, responses)
- Property size
- Booking frequency
- Referral source
- Response time
- Location (in service area)
- Recent activity

**Temperature auto-calculated:**
- 🔥 **Hot** (70+): Ready to convert
- 🟡 **Warm** (45-69): Active prospect
- 🔵 **Cold** (0-44): Early stage

## 🎯 Workflow Example

### For a New Cold Lead:
1. Add lead at `/admin/leads` → "+ Add Lead"
2. System auto-calculates score (probably 20-40 for new cold lead)
3. Lead appears in "Cold Leads" column on pipeline board
4. Click phone → call
5. Log outcome (answered, voicemail, etc.)
6. Score updates automatically
7. Drag to "Warm Leads" when interested
8. Continue through pipeline as they convert

### For a Returning Customer:
1. Leads page shows their lifecycle stage
2. Lifetime value $ displayed
3. Total bookings tracked
4. Can filter by "Loyal/VIP" or "Champion"
5. High-value leads prioritized in score sorting

## 🔧 API Reference

### List Leads
```bash
GET /api/crm/leads?stage=WARM_LEAD&temperature=hot
```

### Move Lead Between Stages
```bash
PATCH /api/crm/pipeline
{
  "leadId": "clx...",
  "stage": "PROSPECT"
}
```

### Create New Lead
```bash
POST /api/crm/leads
{
  "businessName": "ABC Corp",
  "contactName": "John Smith",
  "contactPhone": "512-555-0123",
  "contactEmail": "john@abc.com",
  "city": "Austin",
  "state": "TX",
  "sqft": 5000,
  "source": "referral"
}
```

## 📈 Key Metrics

**Leads Page Shows:**
- Total leads count
- Leads per stage (Cold/Warm/Prospect/Customer/etc.)
- Hot leads count
- New leads count

**Per Lead Shows:**
- Score (1-100)
- Temperature (Cold/Warm/Hot)
- Lifecycle stage
- Lifetime value
- Total bookings
- Days in current stage
- Last contact date
- Next follow-up date

## 💡 Tips

### High-Value Lead Signals
- Large property size (5000+ sqft)
- Referred from existing customer
- Quick response time
- Multiple bookings
- In service area

### Scoring Boosts
- Ask for referral source → +15 points
- Schedule appointment → +10 points
- Get property size → +20 points
- In-service area (Austin metro) → +10 points

### Follow-up Strategy
- Cold leads: 5-7 day follow-up
- Warm leads: 3 day follow-up
- Prospects: 1-2 day follow-up
- Customers: Track lifetime value

## 🔐 Permissions

- **HQ & MANAGER** can: View all leads, create, edit, move stages, bulk actions
- **CLEANER & CUSTOMER** cannot access CRM

## 📱 Mobile Support

- Responsive design works on phone
- Can view pipeline on tablet
- Bulk actions available on mobile
- Quick actions (call, email, text) work on phone

## 🐛 Troubleshooting

### Lead score not updating?
- Scores auto-calculate on create
- Check `updateLeadScoring()` in logs
- Manually trigger via bulk update if needed

### Drag-drop not working?
- Check browser supports HTML5 drag-drop
- Refresh page after move
- Verify API response is successful

### Bulk email not launching?
- Check leads have email addresses
- Default mail client must be configured
- Mobile: May open mail app instead

## 📚 Full Documentation

See: `CRM_IMPLEMENTATION_SUMMARY.md` for complete technical details.

## 🎨 Customization

To modify:

**Stage names/colors:** Edit `STAGE_DEFINITIONS` in `/src/lib/crm/pipeline.ts`

**Scoring weights:** Edit `calculateLeadScore()` in `/src/lib/crm/lead-scoring.ts`

**Lead form fields:** Edit `AddEditLeadModal` in `/app/(admin)/admin/leads/leads-client.tsx`

**Pipeline board layout:** Edit grid in `/src/components/crm/PipelineBoard.tsx`

---

**Questions? Check the code comments!** All functions are well-documented.
