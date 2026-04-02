# GoGreen Complete Gamification System

A comprehensive, role-based gamification system that encourages engagement across all user types: Customers, Cleaners, Managers, and Admins.

## System Overview

### Core Components

1. **XP & Leveling System** (20 Levels)
   - Progressive XP thresholds from 0 to 15,000 XP
   - 20 prestigious level names (Rising Star → GoGreen Master)
   - Emoji badges for visual representation
   - Unlocked perks at key levels (5%, 10%, 15%, 20% discounts, VIP status)

2. **49 Total Achievements**
   - 14 Customer Achievements
   - 13 Cleaner Achievements
   - 10 Manager Achievements
   - 11 Admin/HQ Achievements
   - 5 Universal Achievements

3. **Achievement Categories**
   - Milestones: Major accomplishments
   - Performance: Skill and efficiency based
   - Engagement: Community participation
   - Streak: Consistency rewards
   - General: Onboarding and basic actions

4. **Leaderboards & Recognition**
   - Role-based leaderboards
   - Top 3 celebration styling (Gold/Silver/Bronze)
   - Level distribution visualization
   - Top achievement hunters highlight

## File Structure

### Core Gamification Files

```
/src/lib/
├── achievements-definitions.ts    # 49 achievement definitions by role
├── levels.ts                      # 20 level system with XP thresholds
└── achievements.ts                # (Enhanced) XP tracking & achievement checking

/app/api/
├── gamification/
│   └── route.ts                   # Complete gamification API (GET/POST)
└── achievements/
    └── seed/route.ts              # (Updated) Seeds all 49 achievements

/src/components/
└── GamificationWidget.tsx          # Complete gamification dashboard widget

/app/(admin)/admin/
├── leaderboard/page.tsx            # Full leaderboard with stats
└── achievements/page.tsx           # Achievement gallery by category
```

### Database Models (Prisma)

**Updated Models:**
- `User.xp` - Total XP tracking
- `Achievement` - Achievement definitions
- `UserAchievement` - Unlocked achievements with dates

**New Models:**
- `UserLevel` - Level tracking, streaks, activity dates
- `LevelUpEvent` - Level up history
- `AchievementProgress` - Progress toward multi-step achievements
- `StreakEvent` - Track streaks by event type

## API Endpoints

### GET /api/gamification
Returns complete gamification profile:
```json
{
  "user": { "id", "name", "email", "role" },
  "xp": 2500,
  "level": 8,
  "levelName": "Green Master",
  "badge": "🎓",
  "progress": 45,
  "xpNeededForNext": 850,
  "isMaxLevel": false,
  "achievements": {
    "total": 27,
    "unlocked": 15,
    "locked": 12,
    "unlockedList": [...],
    "lockedList": [...]
  },
  "recentAchievements": [...],
  "leaderboard": {
    "userRank": 3,
    "top5": [...]
  },
  "perks": ["5% service discount", "Priority scheduling"]
}
```

### POST /api/gamification
Award XP for an action:
```json
Request: {
  "eventType": "booking_completed",
  "amount": 50,
  "relatedId": "job_123",
  "relatedType": "job"
}

Response: {
  "success": true,
  "xpAwarded": 50,
  "totalXp": 2550,
  "level": 8,
  "progress": 47,
  "leveledUp": false
}
```

## Achievements by Role

### Customer (14 Achievements)
- First Clean (50 XP)
- Regular (5 bookings, 100 XP)
- Loyal Customer (10 bookings, 200 XP)
- Green Champion (25 bookings, 500 XP)
- Referral Starter/Pro/Champion (100-750 XP)
- Review Writer & 5-Star Reviewer (75-100 XP)
- Eco Warrior (75 XP)
- Early Bird Booker (50 XP)
- Streaks: 3/6/12 Months (150-750 XP)

### Cleaner (13 Achievements)
- First Job Completed (50 XP)
- 50/100 Jobs Milestones (500-1000 XP)
- Five Star Streak (200 XP)
- Speed Demon (75 XP)
- Perfect Week (300 XP)
- Customer Favorite (200 XP)
- Spotless Record (250 XP)
- Team Player/Leader (100-200 XP)
- Early Bird & Reliability Champion (100-200 XP)
- Work Streak 30 days (250 XP)

### Manager (10 Achievements)
- Team Builder (200 XP)
- Team Mentor (300 XP)
- Scheduling Ace (250 XP)
- Perfect Month (350 XP)
- Quick Responder (200 XP)
- Customer Retention Master (400 XP)
- Quality Enforcer (300 XP)
- Pipeline Master (300 XP)
- Revenue Goal Achiever (400 XP)
- Growth Champion (500 XP)

### Admin/HQ (11 Achievements)
- Team Founder (300 XP)
- Leadership Milestone (500 XP)
- Pipeline Pro (300 XP)
- Revenue Driver (500 XP)
- Growth Catalyst (750 XP)
- Efficiency Expert (350 XP)
- Operations Master (400 XP)
- Customer Champion (300 XP)
- Retention Master (400 XP)
- Technology Innovator (250 XP)
- Business Pioneer (1000 XP)

### Universal (5 Achievements)
- Welcome Aboard (5 XP)
- Profile Complete (10 XP)
- Daily Active (50 XP)
- Week Warrior (100 XP)
- Hall of Fame (0 XP - unlocked at Level 15)

## Level System (20 Levels)

| Level | Name | Title | Badge | XP | Perks |
|-------|------|-------|-------|----|----|
| 1 | Rising Star | Just Starting | ⭐ | 0 | Basic access |
| 2 | Green Starter | Getting Started | 🌱 | 50 | Leaderboard view |
| 3 | Eco Explorer | Growing Knowledge | 🔍 | 150 | Premium tips |
| 4 | Clean Champion | Gaining Momentum | 🏆 | 300 | Profile badge |
| 5 | Green Guardian | Trusted Member | 💚 | 500 | **5% Discount** |
| 6 | Sustainability Guide | Expert Contributor | 🌿 | 750 | Exclusive content |
| 7 | Eco Enthusiast | Valued Member | 🌍 | 1050 | Networking badge |
| 8 | Green Master | Respected Professional | 🎓 | 1400 | **10% Discount** |
| 9 | Sustainability Advocate | Community Leader | 📢 | 1800 | Exclusive events |
| 10 | Environmental Champion | Established Expert | 👑 | 2300 | **VIP Status** |
| 11 | Green Visionary | Influential Contributor | ✨ | 2900 | Early feature access |
| 12 | Eco Influencer | Industry Insider | 🌟 | 3600 | **15% Discount** |
| 13 | Sustainability Luminary | Thought Leader | 💫 | 4400 | Featured highlights |
| 14 | GoGreen Pioneer | Legendary Member | 🚀 | 5300 | Custom badge |
| 15 | GoGreen Legend | Icon of Excellence | 🏅 | 6400 | **20% Discount** + Hall of Fame |
| 16 | Sustainability Oracle | Master of Ecosystem | 🔮 | 7600 | Partnership opportunities |
| 17 | Environmental Deity | Peak Excellence | ⚡ | 9000 | Lifetime premium |
| 18 | GoGreen Architect | Visionary Supreme | 🏗️ | 10600 | Executive council |
| 19 | Ecosystem Guardian | Custodian of Green | 🛡️ | 12400 | Ultimate VIP |
| 20 | GoGreen Master | Supreme Legend | 👑 | 15000 | All perks + Eternal recognition |

## UI Components

### GamificationWidget
A comprehensive dashboard widget showing:
- Current level with progress bar
- XP statistics
- Recent achievements with celebration styling
- Top leaderboard positions
- Next goals (upcoming achievements)
- Active perks display

**Location:** `/src/components/GamificationWidget.tsx`

### Leaderboard Page
Full leaderboard with:
- User standings and rank
- Member distribution by level
- Top achievement hunters
- Role-based filtering
- Celebration styling for top 3

**Location:** `/app/(admin)/admin/leaderboard/page.tsx`

### Achievements Gallery
Achievement showcase with:
- Category filtering
- Progress visualization
- Unlocked/locked status
- XP rewards display
- Unlock dates for earned achievements

**Location:** `/app/(admin)/admin/achievements/page.tsx`

## Implementation Guide

### 1. Database Migration
```bash
# Run Prisma migration to add new models
npx prisma migrate dev --name add_gamification_enhancements
```

### 2. Seed Achievements
```bash
# POST to seed all 49 achievements
curl -X POST http://localhost:3000/api/achievements/seed \
  -H "Cookie: [your_auth_cookie]"
```

### 3. Award XP
```typescript
// From any action handler
import { awardXp } from "@/src/lib/achievements";

await awardXp(userId, "booking_completed", 50, bookingId, "booking");
```

### 4. Display Gamification
```typescript
// In any page/component
import { GamificationWidget } from "@/src/components/GamificationWidget";

export default function Dashboard() {
  return (
    <div className="grid lg:grid-cols-3">
      {/* Main content */}
      <div className="lg:col-span-2">{/* ... */}</div>
      {/* Gamification */}
      <GamificationWidget />
    </div>
  );
}
```

## Utility Functions

### From `/src/lib/levels.ts`

```typescript
// Calculate level from XP
const levelInfo = calculateLevelInfo(2500);
// { level: 8, levelInfo: {...}, progress: 45, ... }

// Format display info
const display = formatLevelDisplay(2500);
// { level: 8, name: "Green Master", badge: "🎓", title: "..." }

// Check for specific perk
const hasDiscount = hasPerk(2500, "5% service discount");

// Get all perks for level
const perks = getUnlockedPerks(2500);
// ["Basic access", "Leaderboard view", ...]
```

### From `/src/lib/achievements.ts`

```typescript
// Award XP and check achievements
await awardXp(userId, "job_completed", 75);

// Get user summary
const summary = await getUserAchievementSummary(userId, role);

// Get achievements for role
const achievements = await getAchievementsForRole("CLEANER");

// Get unlocked achievements
const unlocked = await getUnlockedAchievements(userId);
```

## Integration Points

### Service Completion
```typescript
// When a service/job is completed
await awardXp(cleanerId, "job_completed", 75);
await awardXp(customerId, "booking_completed", 50);
```

### Reviews & Ratings
```typescript
// When a 5-star review is left
await awardXp(userId, "review_submitted", 25);
if (stars === 5) await awardXp(userId, "five_star_review", 100);
```

### Referrals
```typescript
// When referral confirmed
await awardXp(referrerId, "referral_confirmed", 100);
```

### Streaks
```typescript
// Track booking/activity streaks
await prisma.streakEvent.create({
  data: { userId, eventType: "booking", eventDate: new Date() }
});
```

## Design Highlights

- **Green Brand Theme:** All components use the brand color palette (brand-600, brand-700)
- **Celebration Styling:** Top 3 positions highlighted with gold/silver/bronze
- **Progressive Rewards:** Increasing benefits unlock at each tier
- **Emoji Badges:** Visual, memorable level indicators
- **Responsive Design:** Works on mobile, tablet, and desktop
- **Accessible:** Full keyboard navigation and screen reader support
- **Performance:** Optimized queries with proper indexing

## Total XP by Role

- **Customer:** Max ~4,500 XP across all achievements
- **Cleaner:** Max ~4,575 XP across all achievements
- **Manager:** Max ~3,950 XP across all achievements
- **Admin/HQ:** Max ~4,750 XP across all achievements

## Future Enhancements

1. **Seasonal Challenges:** Limited-time achievements for seasonal events
2. **Team Achievements:** Cooperative goals requiring multiple users
3. **Streaks Page:** Dedicated streak tracking and management
4. **Achievement Notifications:** Real-time celebration notifications
5. **Social Features:** Share achievements on profiles
6. **Badges Store:** Cosmetic items purchasable with XP
7. **Daily Quests:** Quick 5-XP daily tasks
8. **Achievement Analysis:** Charts showing progress over time

---

**System Created:** March 2026
**Total Achievements:** 49
**Total Levels:** 20
**Default Max XP:** 15,000
**Roles Supported:** All (CUSTOMER, CLEANER, MANAGER, HQ)
