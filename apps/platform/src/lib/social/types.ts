import type { SocialPlatform } from "@prisma/client";

export type SocialPostInput = {
  platform: SocialPlatform;
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  scheduledFor?: Date;
  blogPostId?: string;
  aiGenerated?: boolean;
};

export type PublishResult = {
  success: boolean;
  externalPostId?: string;
  error?: string;
};

export type PlatformConfig = {
  accessToken: string;
  pageId?: string;       // Facebook Page ID
  accountId?: string;    // Instagram Business Account ID
};

export type ContentVariant = {
  platform: SocialPlatform;
  content: string;
  hashtags: string[];
};
