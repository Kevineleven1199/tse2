/**
 * Holiday Calendar for Newsletter Content
 * Pre-loaded US holidays with cleaning-themed angles
 * Covers all major holidays across the full year
 */

export type Holiday = {
  name: string;
  month: number; // 1-12
  day: number;
  /** If true, the date shifts yearly (e.g., Easter, Thanksgiving) */
  floating?: boolean;
  /** Subject line for the newsletter */
  subject: string;
  /** Short preview text */
  preview: string;
  /** Main newsletter body (HTML-safe) */
  body: string;
  /** Call-to-action text */
  cta: string;
  /** Optional discount code */
  promoCode?: string;
};

// Helper to get Easter date for a given year (Anonymous Gregorian algorithm)
export const getEasterDate = (year: number): { month: number; day: number } => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
};

// Get Thanksgiving (4th Thursday in November)
export const getThanksgivingDate = (year: number): { month: number; day: number } => {
  const nov1 = new Date(year, 10, 1);
  const dayOfWeek = nov1.getDay();
  const firstThursday = dayOfWeek <= 4 ? 5 - dayOfWeek : 12 - dayOfWeek;
  return { month: 11, day: firstThursday + 21 };
};

// Get Memorial Day (last Monday in May)
export const getMemorialDayDate = (year: number): { month: number; day: number } => {
  const may31 = new Date(year, 4, 31);
  const dayOfWeek = may31.getDay();
  const lastMonday = dayOfWeek === 0 ? 25 : 31 - dayOfWeek + 1;
  return { month: 5, day: lastMonday };
};

// Get Labor Day (first Monday in September)
export const getLaborDayDate = (year: number): { month: number; day: number } => {
  const sep1 = new Date(year, 8, 1);
  const dayOfWeek = sep1.getDay();
  const firstMonday = dayOfWeek === 0 ? 2 : dayOfWeek === 1 ? 1 : 9 - dayOfWeek;
  return { month: 9, day: firstMonday };
};

// Get MLK Day (third Monday in January)
export const getMLKDayDate = (year: number): { month: number; day: number } => {
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay();
  const firstMonday = dayOfWeek === 0 ? 2 : dayOfWeek === 1 ? 1 : 9 - dayOfWeek;
  return { month: 1, day: firstMonday + 14 };
};

// Get Presidents Day (third Monday in February)
export const getPresidentsDayDate = (year: number): { month: number; day: number } => {
  const feb1 = new Date(year, 1, 1);
  const dayOfWeek = feb1.getDay();
  const firstMonday = dayOfWeek === 0 ? 2 : dayOfWeek === 1 ? 1 : 9 - dayOfWeek;
  return { month: 2, day: firstMonday + 14 };
};

/**
 * Fixed-date holidays
 */
export const FIXED_HOLIDAYS: Holiday[] = [
  {
    name: "New Year's Day",
    month: 1,
    day: 1,
    subject: "Fresh Year, Fresh Home — Start 2025 Clean & Green!",
    preview: "Ring in the new year with a home that sparkles naturally.",
    body: `Happy New Year from Tri State Enterprise! There's no better way to start the year than with a home that's truly fresh — not just surface clean, but deeply refreshed with plant-powered products that are safe for your family.

This January, let us help you keep your New Year's resolution for a healthier home. Our organic deep cleans remove holiday dust, allergens, and leftover party residue without any harsh chemicals.

Start the year breathing easier. Your family (and your pets!) will thank you.`,
    cta: "Book Your New Year Deep Clean",
    promoCode: "FRESH2025",
  },
  {
    name: "Valentine's Day",
    month: 2,
    day: 14,
    subject: "Show Your Home Some Love This Valentine's Day",
    preview: "Give the gift of a sparkling, toxin-free home.",
    body: `This Valentine's Day, show your home — and your loved ones — some extra love with a professional organic clean.

Imagine coming home to freshly polished surfaces, sparkling bathrooms, and that unmistakable feeling of a truly clean space — all without a single harsh chemical. It's the kind of gift that keeps giving, because a healthier home means a healthier family.

Treat yourself or surprise someone special with a Tri State gift certificate. Love is in the (clean) air!`,
    cta: "Gift a Clean Home",
  },
  {
    name: "St. Patrick's Day",
    month: 3,
    day: 17,
    subject: "Tri State for Real This St. Patrick's Day!",
    preview: "We're green every day — not just March 17th.",
    body: `While everyone else is wearing green for a day, we live it every day at Tri State Enterprise!

Our EPA Safer Choice certified products are truly green — no greenwashing here. Every product we bring into your home is plant-based, biodegradable, and safe for kids, pets, and the Kentucky waterways we all love.

This St. Patrick's Day, make the switch to a cleaning service that's green where it counts. Your home, your health, and our Flatwoods ecosystem will all benefit.`,
    cta: "Switch to Green Cleaning",
    promoCode: "TRISTATE17",
  },
  {
    name: "Earth Day",
    month: 4,
    day: 22,
    subject: "Earth Day Every Day — How We Clean for the Planet",
    preview: "Celebrate Earth Day with a home that's good for the planet.",
    body: `Happy Earth Day from your friends at Tri State Enterprise!

Every day is Earth Day for our team. Here's how we make a difference with every clean:

• Zero single-use plastic bottles — we use refillable systems
• 100% plant-based, biodegradable cleaning solutions
• Low-VOC processes that protect indoor and outdoor air quality
• HEPA filtration to capture allergens without chemical sprays

When you choose Tri State, you're not just getting a clean home — you're choosing a cleaner planet. This Earth Day, make the switch that matters.`,
    cta: "Clean Green Today",
  },
  {
    name: "Mother's Day",
    month: 5,
    day: 11,
    subject: "The Best Mother's Day Gift? A Spotless Home She Didn't Clean",
    preview: "Give Mom the gift of relaxation with a professional organic clean.",
    body: `This Mother's Day, give the mom in your life something she actually wants — a perfectly clean home that she didn't have to lift a finger for.

Our organic cleaning gift certificates are the perfect way to say "thank you" and "take a break." We'll handle every room with eco-friendly products that are safe for the whole family.

No harsh chemicals. No stress. Just a beautifully clean home and a happy mom.

Gift certificates available in any amount — delivered instantly by email.`,
    cta: "Gift Mom a Clean Home",
  },
  {
    name: "Father's Day",
    month: 6,
    day: 15,
    subject: "Give Dad the Day Off — We'll Handle the Cleaning",
    preview: "This Father's Day, Dad deserves a break from chores.",
    body: `This Father's Day, take cleaning off Dad's to-do list for good.

Whether it's the garage deep clean he's been putting off, the pressure wash the driveway desperately needs, or just a full-house refresh so he can kick back and relax — we've got it covered.

Our eco-friendly cleaning crew handles everything with plant-based products and professional care. Give Dad the gift of a clean home without the work.`,
    cta: "Book Dad's Day Off",
  },
  {
    name: "Independence Day",
    month: 7,
    day: 4,
    subject: "Pre-4th Deep Clean — Get Party-Ready, the Green Way!",
    preview: "Hosting a cookout? Let us get your home guest-ready.",
    body: `The 4th of July is right around the corner! Whether you're hosting a backyard cookout, a pool party, or just enjoying family time, there's nothing better than celebrating in a home that's spotlessly clean.

Let us handle the pre-party prep so you can focus on the fireworks:

• Kitchen deep clean for all that cooking
• Bathroom refresh for guests
• Patio and outdoor area scrub-down
• Post-party cleanup available too!

All done with our signature organic products — safe for kids, pets, and the Kentucky heat.`,
    cta: "Book Pre-Party Clean",
    promoCode: "FREEDOM24",
  },
  {
    name: "Back to School",
    month: 8,
    day: 15,
    subject: "Back to School, Back to Clean — Reset Your Home",
    preview: "Start the school year with a fresh, healthy home.",
    body: `Summer's winding down and the kids are heading back to school. It's the perfect time to reset your home with a thorough organic deep clean.

After months of summer fun, sand, and sunscreen, your home could use some extra attention. Our team will tackle the post-summer buildup with plant-based products that eliminate germs and allergens without the harsh chemicals.

A clean home means fewer sick days, better sleep, and a fresh start for the whole family. Let's get your home school-year ready!`,
    cta: "Book a Back-to-School Clean",
  },
  {
    name: "Halloween",
    month: 10,
    day: 31,
    subject: "Don't Let Dust Bunnies Haunt Your Home!",
    preview: "Scare away dirt with an organic deep clean before Halloween.",
    body: `This Halloween, the only thing scary should be your costume — not the dust bunnies under the couch!

Before the trick-or-treaters arrive, let us give your home a thorough organic clean. We'll banish the cobwebs (the real ones!), polish every surface, and leave your home smelling fresh — naturally.

Hosting a Halloween party? Our pre-event cleaning packages ensure your home is guest-ready, and our post-party cleanup handles the aftermath. No tricks, just treats for your home.`,
    cta: "Banish the Dust Bunnies",
  },
  {
    name: "Veterans Day",
    month: 11,
    day: 11,
    subject: "Thank You, Veterans — 15% Off This Week",
    preview: "Honoring those who served with a special cleaning discount.",
    body: `This Veterans Day, Tri State Enterprise honors the brave men and women who have served our country.

As a small token of our gratitude, we're offering 15% off any cleaning service for veterans and active military families this week. You've served our country — let us serve your home.

Thank you for your sacrifice and service. We're proud to be part of the Flatwoods community alongside you.`,
    cta: "Claim Your Veterans Discount",
    promoCode: "VETDAY15",
  },
  {
    name: "Christmas",
    month: 12,
    day: 25,
    subject: "Merry Christmas from Tri State — Holiday Cleaning Specials!",
    preview: "Give the gift of a clean home this holiday season.",
    body: `Merry Christmas from our Tri State family to yours!

The holiday season is about creating memories, not scrubbing floors. Let us handle the cleaning so you can focus on what matters most — time with loved ones.

Our holiday cleaning packages include:

• Pre-holiday deep clean for guests
• Post-holiday reset and de-cluttering support
• Gift certificates for the perfect last-minute present
• Kitchen and dining deep clean for all those holiday meals

Wishing you a joyful, healthy, and sparkling clean holiday season!`,
    cta: "Book Holiday Cleaning",
    promoCode: "JOLLY25",
  },
  {
    name: "New Year's Eve",
    month: 12,
    day: 31,
    subject: "Ring in the New Year with a Sparkling Home",
    preview: "Start fresh — book your New Year's clean today.",
    body: `As we close out the year, there's no better way to prepare for new beginnings than with a home that feels completely refreshed.

Our end-of-year deep clean is the perfect way to:

• Clear out the holiday mess
• Start January with a blank slate
• Remove allergens and dust from the past year
• Create a healthier environment for the year ahead

Book before December 31st and we'll include a complimentary eco-friendly air freshening treatment with your service. Here's to a clean, green new year!`,
    cta: "Book Your Year-End Clean",
  },
];

/**
 * Get all holidays for a specific year, including floating ones
 */
export const getHolidaysForYear = (year: number): (Holiday & { date: Date })[] => {
  const holidays: (Holiday & { date: Date })[] = [];

  // Fixed holidays
  for (const h of FIXED_HOLIDAYS) {
    holidays.push({ ...h, date: new Date(year, h.month - 1, h.day) });
  }

  // Floating holidays
  const easter = getEasterDate(year);
  holidays.push({
    name: "Easter",
    month: easter.month,
    day: easter.day,
    subject: "Spring Into a Fresh, Naturally Clean Home This Easter",
    preview: "Celebrate renewal with an organic deep clean.",
    body: `Happy Easter from Tri State Enterprise!

Easter is all about renewal and fresh starts — and that extends to your home too. After a long winter, spring is the perfect time for a deep, thorough clean with our plant-based products.

Our spring cleaning packages are designed to shake off winter dust, refresh every room, and leave your home feeling brand new. Open the windows, let the Kentucky sunshine in, and breathe easy knowing every surface has been cleaned the green way.

From our family to yours, wishing you a beautiful Easter filled with joy and freshness.`,
    cta: "Book Your Spring Clean",
    date: new Date(year, easter.month - 1, easter.day),
  });

  const thanksgiving = getThanksgivingDate(year);
  holidays.push({
    name: "Thanksgiving",
    month: thanksgiving.month,
    day: thanksgiving.day,
    subject: "Get Thanksgiving-Ready — Pre-Holiday Deep Clean",
    preview: "Guests coming? Let us get your home ready for the feast.",
    body: `Thanksgiving is almost here, and if you're hosting, you know the pressure of getting your home guest-ready while planning the perfect meal.

Let Tri State take the cleaning off your plate (pun intended!) so you can focus on the turkey, the stuffing, and the people you love.

Our pre-Thanksgiving package includes:

• Full kitchen deep clean and sanitization
• Guest bathroom refresh
• Living and dining area polish
• Entryway and high-traffic area attention

All done with our organic, family-safe products. Because the only thing your guests should smell is pumpkin pie.`,
    cta: "Book Pre-Thanksgiving Clean",
    promoCode: "THANKFUL",
    date: new Date(year, thanksgiving.month - 1, thanksgiving.day),
  });

  const memorialDay = getMemorialDayDate(year);
  holidays.push({
    name: "Memorial Day",
    month: memorialDay.month,
    day: memorialDay.day,
    subject: "Memorial Day Weekend — Start Summer with a Clean Home",
    preview: "Kick off summer the right way with an organic deep clean.",
    body: `Memorial Day marks the unofficial start of summer in Flatwoods, and there's no better way to kick off the season than with a deep, refreshing clean.

Before the pool parties, barbecues, and beach days begin, let us get your home summer-ready:

• Deep clean to remove spring allergens
• Kitchen and outdoor area prep for entertaining
• Bathroom and guest room refresh
• Kentucky-humidity mold prevention treatment

Enjoy the long weekend and let us handle the rest. Book now for pre-Memorial Day availability!`,
    cta: "Book Summer Kickoff Clean",
    date: new Date(year, memorialDay.month - 1, memorialDay.day),
  });

  const laborDay = getLaborDayDate(year);
  holidays.push({
    name: "Labor Day",
    month: laborDay.month,
    day: laborDay.day,
    subject: "Labor Day Sale — Take the Day Off from Cleaning!",
    preview: "You deserve a break. Let us clean while you relax.",
    body: `Happy Labor Day! You work hard all year — today is about relaxing, not cleaning.

This Labor Day weekend, let Tri State Enterprise handle the housework so you can truly enjoy your day off. Our team will tackle every room with eco-friendly products while you enjoy the last long weekend of summer.

Whether you need a quick refresh or a full deep clean, we're here to help you make the most of your well-deserved break.`,
    cta: "Book Your Day Off",
    date: new Date(year, laborDay.month - 1, laborDay.day),
  });

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
};

/**
 * Check if today (or a specific date) matches a holiday (+/- 2 days for pre-holiday emails)
 */
export const getUpcomingHoliday = (
  date: Date = new Date(),
  daysAhead: number = 2
): (Holiday & { date: Date }) | null => {
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);
  const targetTime = date.getTime();

  for (const holiday of holidays) {
    const diff = holiday.date.getTime() - targetTime;
    const daysUntil = diff / (1000 * 60 * 60 * 24);
    if (daysUntil >= 0 && daysUntil <= daysAhead) {
      return holiday;
    }
  }

  return null;
};
