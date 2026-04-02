/**
 * Newsletter Generator
 * Selects and assembles today's newsletter without any AI API calls
 * Uses pre-loaded content library + holiday calendar
 */

import { getUpcomingHoliday } from "./holidays";
import { selectContent, type NewsletterContent } from "./content";
import { renderNewsletterHTML } from "./templates";

export type GeneratedNewsletter = {
  subject: string;
  preview: string;
  html: string;
  text: string;
  source: "holiday" | "content";
  date: Date;
};

/**
 * Get the day of year (1-365)
 */
const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

/**
 * Generate today's newsletter
 */
export const generateNewsletter = (date: Date = new Date()): GeneratedNewsletter => {
  // Check for upcoming holiday first (within 2 days)
  const holiday = getUpcomingHoliday(date);

  if (holiday) {
    const content: NewsletterContent = {
      subject: holiday.subject,
      preview: holiday.preview,
      heading: holiday.name,
      body: holiday.body,
      cta: { text: holiday.cta, url: "/get-a-quote" },
      promoCode: holiday.promoCode,
      category: "seasonal",
    };

    return {
      subject: holiday.subject,
      preview: holiday.preview,
      html: renderNewsletterHTML(content, date),
      text: stripHTML(holiday.body),
      source: "holiday",
      date,
    };
  }

  // Fall back to rotating content
  const dayOfYear = getDayOfYear(date);
  const content = selectContent(date, dayOfYear);

  return {
    subject: content.subject,
    preview: content.preview,
    html: renderNewsletterHTML(content, date),
    text: stripHTML(content.body),
    source: "content",
    date,
  };
};

/**
 * Preview the next N days of newsletters
 */
export const previewUpcoming = (days: number = 7): GeneratedNewsletter[] => {
  const previews: GeneratedNewsletter[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    previews.push(generateNewsletter(date));
  }

  return previews;
};

/**
 * Generate a newsletter for a specific date, skipping subjects used recently.
 * Pass an array of recent subject lines (e.g. last 7 days from DB/logs)
 * to avoid sending duplicate content.
 */
export const getNewsletterForDate = (
  date: Date,
  recentSubjects: string[] = []
): GeneratedNewsletter => {
  const primary = generateNewsletter(date);

  const recentSet = new Set(recentSubjects.map((s) => s.toLowerCase().trim()));
  if (!recentSet.has(primary.subject.toLowerCase().trim())) {
    return primary;
  }

  // Try offsetting by weeks to get different rotation slot
  for (let offset = 1; offset <= 10; offset++) {
    const altDate = new Date(date);
    altDate.setDate(altDate.getDate() + offset * 7);
    const alt = generateNewsletter(altDate);
    alt.date = date;
    if (!recentSet.has(alt.subject.toLowerCase().trim())) {
      return alt;
    }
  }

  return primary;
};

/**
 * Strip HTML tags for plain text version
 */
const stripHTML = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
};
