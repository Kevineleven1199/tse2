# Gamification System Setup Guide

Complete step-by-step guide to deploy the GoGreen gamification system.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database with existing connection
- Admin/HQ user account for seeding

## Installation Steps

### Step 1: Update Prisma Schema ✓
The schema has been updated with new models:
- `UserLevel` - Track user levels and streaks
- `LevelUpEvent` - Log level-up events
- `AchievementProgress` - Track achievement progress
- `StreakEvent` - Track daily/activity streaks

**Files Modified:**
- `/prisma/schema.prisma` - Added 4 new models at the end

### Step 2: Run Database Migration

```bash
# Generate and run migration
npx prisma migrate dev --name add_gamification_enhancements

# Or if using production:
npx prisma migrate deploy
```

This will:
- Create new tables for gamification
- Add proper indexes for performance
- Update existing User model to support XP

### Step 3: Deploy New Files

All files have been created:

**Core Libraries:**
- ✓ `/src/lib/achievements-definitions.ts` - 49 achievements
- ✓ `/src/lib/levels.ts` - 20-level system
- ✓ `/src/lib/achievements.ts` - Enhanced (backward compatible)

**API Routes:**
- ✓ `/app/api/gamification/route.ts` - Main API
- ✓ `/app/api/achievements/seed/route.ts` - Updated seeding

**Components:**
- ✓ `/src/components/GamificationWidget.tsx` - Dashboard widget

**Pages:**
- ✓ `/app/(admin)/admin/leaderboard/page.tsx` - Full leaderboard
- ✓ `/app/(admin)/admin/achievements/page.tsx` - Achievement gallery

### Step 4: Seed Achievements

Log in as an Admin/HQ user and call the seed endpoint:

```bash
curl -X POST http://localhost:3000/api/achievements/seed \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_session_cookie]"
```

Or trigger it from the browser:
```typescript
fetch('/api/achievements/seed', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Achievements seeded successfully",
  "created": 49,
  "updated": 0,
  "total": 49
}
```

### Step 5: Add GamificationWidget to Dashboard

Edit `/app/(admin)/admin/page.tsx` to include the widget:

```typescript
import { GamificationWidget } from "@/src/components/GamificationWidget";

export default async function AdminHome() {
  // ... existing code ...

  return (
    <div className="space-y-6">
      {/* Existing dashboard content */}

      {/* Add gamification widget to sidebar or main area */}
      <div className="lg:col-span-1">
        <GamificationWidget />
      </div>
    </div>
  );
}
```

### Step 6: Test the System

#### Test Getting Gamification Data
```bash
curl http://localhost:3000/api/gamification
```

#### Test Awarding XP
```bash
curl -X POST http://localhost:3000/api/gamification \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "booking_completed",
    "amount": 50
  }'
```

#### View Pages
- Gamification Widget: Should display on dashboard
- Leaderboard: Navigate to `/admin/leaderboard`
- Achievements: Navigate to `/admin/achievements`

## Integration with Existing Features

### Booking Completion
```typescript
// In booking completion handler
import { awardXp } from "@/src/lib/achievements";

// Award customer
await awardXp(booking.customerId, "booking_completed", 50);

// Award cleaner
await awardXp(assignment.cleanerId, "job_completed", 75);
```

### Review Submission
```typescript
// In review creation handler
import { awardXp } from "@/src/lib/achievements";

await awardXp(review.authorId, "review_submitted", 25);

if (review.rating === 5) {
  await awardXp(review.authorId, "five_star_review", 100);
}
```

### Referral System
```typescript
// When referral confirmed
import { awardXp } from "@/src/lib/achievements";

await awardXp(referral.referrerId, "referral_confirmed", 100);
```

### Login Tracking
```typescript
// On successful login
import { awardXp } from "@/src/lib/achievements";

// Award daily XP (prevent duplicate with check)
const lastEvent = await prisma.xpEvent.findFirst({
  where: {
    userId,
    eventType: "daily_login",
    createdAt: { gte: startOfDay(new Date()) }
  }
});

if (!lastEvent) {
  await awardXp(userId, "daily_login", 5);
}
```

## Database Queries for Management

### Check User's XP and Level
```sql
SELECT id, firstName, lastName, xp,
  CASE
    WHEN xp >= 15000 THEN 20
    WHEN xp >= 12400 THEN 19
    WHEN xp >= 10600 THEN 18
    -- ... add all 20 levels
    ELSE 1
  END as level
FROM "User"
WHERE id = 'user_id';
```

### Get Leaderboard
```sql
SELECT id, firstName, lastName, xp, COUNT(DISTINCT ua.id) as achievements
FROM "User" u
LEFT JOIN "UserAchievement" ua ON u.id = ua.userId
WHERE u.role = 'CUSTOMER'
GROUP BY u.id
ORDER BY u.xp DESC
LIMIT 10;
```

### Check Specific Achievement
```sql
SELECT u.id, u.firstName, ua.unlockedAt
FROM "User" u
LEFT JOIN "UserAchievement" ua ON u.id = ua.userId
LEFT JOIN "Achievement" a ON ua.achievementId = a.id
WHERE a.key = 'green_champion';
```

## Troubleshooting

### Migration Failed
```bash
# Reset migrations (dev only, careful in production!)
npx prisma migrate resolve --rolled-back add_gamification_enhancements

# Then try again
npx prisma migrate dev --name add_gamification_enhancements
```

### Achievements Not Seeding
- Verify you're logged in as HQ/Admin
- Check browser console for errors
- Verify database connection with: `npx prisma db push --skip-generate`
- Check tenant ID is set correctly

### Widget Not Loading
- Verify API endpoint at `/api/gamification` returns data
- Check user has valid session
- Check browser Network tab for 401/404 errors
- Verify database has achievements seeded

### Performance Issues
- Check indexes were created: `\d "User"` (in psql)
- Consider archiving old `XpEvent` records
- Add caching to leaderboard queries if needed

## Configuration

### Adjusting XP Values
Edit `/src/lib/achievements-definitions.ts`:
```typescript
{
  key: "booking_completed",
  // ...
  xpReward: 50,  // Change this value
  // ...
}
```

Then re-seed:
```bash
curl -X POST http://localhost:3000/api/achievements/seed
```

### Adjusting Level Thresholds
Edit `/src/lib/levels.ts`:
```typescript
const LEVELS: LevelInfo[] = [
  {
    level: 1,
    xpRequired: 0,  // Can't change (starting level)
    // ...
  },
  {
    level: 2,
    xpRequired: 50,  // Change this
    // ...
  },
  // ...
];
```

### Adjusting Perks
Edit perks array in each level in `/src/lib/levels.ts`:
```typescript
{
  level: 5,
  perks: [
    "5% service discount (customers)",  // Edit these
    "Priority scheduling (cleaners)"
  ],
  // ...
}
```

## Monitoring & Analytics

### View All XP Events
```sql
SELECT * FROM "XpEvent"
WHERE createdAt > NOW() - INTERVAL '7 days'
ORDER BY createdAt DESC;
```

### Total XP Distributed
```sql
SELECT SUM(amount) as total_xp FROM "XpEvent";
```

### Most Earned Achievements
```sql
SELECT a.title, COUNT(*) as count
FROM "UserAchievement" ua
JOIN "Achievement" a ON ua.achievementId = a.id
GROUP BY a.id
ORDER BY count DESC
LIMIT 10;
```

### Average Level by Role
```sql
SELECT role,
  ROUND(AVG(CASE
    WHEN xp >= 15000 THEN 20
    -- ... add all calculations
    ELSE 1
  END)) as avg_level
FROM "User"
GROUP BY role;
```

## Deployment Checklist

- [ ] Database migration applied
- [ ] New files deployed
- [ ] Achievements seeded
- [ ] GamificationWidget added to dashboard
- [ ] Integration code added to booking/review/referral handlers
- [ ] XP event tracking verified
- [ ] Leaderboard page tested
- [ ] Achievements page tested
- [ ] Widget displays correctly
- [ ] Mobile responsiveness checked
- [ ] Performance tested with real data
- [ ] Error handling verified

## Support & Debugging

Enable debug logging:
```typescript
// In any gamification function
console.log("[gamification]", "event:", eventType, "xp:", amount);
```

Check logs for issues:
```bash
# Tail logs (if using Vercel)
vercel logs

# Or check application logs for any errors
```

## Performance Notes

The system includes indexes on:
- `User(tenantId, role)` - For leaderboard queries
- `UserAchievement(userId)` - For achievement lookups
- `XpEvent(userId, eventType)` - For analytics
- `StreakEvent(userId, eventDate)` - For streak tracking

Expected query times:
- Get user gamification: < 100ms
- Award XP: < 200ms (with achievement check)
- Get leaderboard (top 100): < 300ms
- Get all achievements: < 150ms

---

**Setup Version:** 1.0
**Last Updated:** March 2026
**System Stability:** Production-Ready
