-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HQ', 'MANAGER', 'CLEANER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('HOME_CLEAN', 'PRESSURE_WASH', 'AUTO_DETAIL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'QUOTED', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'CLAIMED', 'SCHEDULED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SchedulingStatus" AS ENUM ('PENDING', 'SELECTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('OPENPHONE', 'JOBBER', 'WISE', 'ZELLE', 'PAYPAL', 'GOOGLE_CALENDAR', 'APPLE_CALENDAR', 'ADP_1099', 'SLACK');

-- CreateEnum
CREATE TYPE "CommunityAudience" AS ENUM ('PUBLIC', 'TEAM');

-- CreateEnum
CREATE TYPE "CommunityCategory" AS ENUM ('CLEANING_TIP', 'ECO_TIP', 'RECOMMENDATION', 'QUESTION', 'CLEANER_SPOTLIGHT', 'PROMOTION', 'ANNOUNCEMENT', 'BEFORE_AFTER');

-- CreateEnum
CREATE TYPE "CommunityAuthorRole" AS ENUM ('CLIENT', 'CLEANER', 'ADMIN', 'GOGREEN');

-- CreateEnum
CREATE TYPE "CommunityReactionType" AS ENUM ('LIKE', 'HELPFUL', 'LOVE', 'CELEBRATE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'DENIED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "ReviewRequestStatus" AS ENUM ('PENDING', 'SENT', 'CLICKED', 'REVIEWED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CancellationFeeType" AS ENUM ('FLAT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REWARDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'launch',
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#0fb77a',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "customDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "serviceRadius" INTEGER NOT NULL DEFAULT 15,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "payoutMethod" TEXT NOT NULL DEFAULT 'WISE',
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 25.0,

    CONSTRAINT "CleanerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerSkill" (
    "id" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CleanerSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "description" TEXT,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'flat',
    "durationMin" INTEGER NOT NULL DEFAULT 120,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "serviceType" "ServiceType" NOT NULL,
    "squareFootage" INTEGER,
    "surfaces" TEXT[],
    "preferredStart" TIMESTAMP(3),
    "preferredEnd" TIMESTAMP(3),
    "preferredWindows" JSONB,
    "notes" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "driveFolderUrl" TEXT,
    "driveFolderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "fees" DOUBLE PRECISION NOT NULL,
    "taxes" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "aiVersion" TEXT NOT NULL DEFAULT 'v1',
    "smartNotes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "crewSize" INTEGER NOT NULL DEFAULT 2,
    "payoutAmount" DOUBLE PRECISION,
    "estimatedHours" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "confirmationId" TEXT,
    "jobberQuoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'CLAIMED',
    "enRouteAt" TIMESTAMP(3),
    "clockInAt" TIMESTAMP(3),
    "clockOutAt" TIMESTAMP(3),

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingPreference" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" "SchedulingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "quoteId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "providerIntentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "deposit" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerPayout" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerPayoutId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'QUEUED',
    "initiatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'tentative',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "tenantId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSync" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "CommunityCategory" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "audience" "CommunityAudience" NOT NULL DEFAULT 'PUBLIC',
    "mediaUrl" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorName" TEXT NOT NULL,
    "authorRole" "CommunityAuthorRole" NOT NULL DEFAULT 'GOGREEN',
    "authorBadge" TEXT,
    "authorUserId" TEXT,
    "neighborhood" TEXT NOT NULL DEFAULT 'Community',
    "city" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" "CommunityAuthorRole" NOT NULL DEFAULT 'CLIENT',
    "authorBadge" TEXT,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "actorKey" TEXT NOT NULL,
    "actorName" TEXT,
    "authorUserId" TEXT,
    "reaction" "CommunityReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityView" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "actorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'ten_gogreen',
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallTranscript" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "callId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "phoneNumber" TEXT,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transcript" TEXT,
    "dialogue" JSONB,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "metadata" JSONB,
    "estimatedService" TEXT,
    "serviceType" TEXT,
    "estimatedTotal" DOUBLE PRECISION,
    "estimatedCost" DOUBLE PRECISION,
    "estimateBreakdown" JSONB,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "address" TEXT,
    "propertyAddress" TEXT,
    "sqft" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DOUBLE PRECISION,
    "sentiment" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT true,
    "followUpNotes" TEXT,
    "requestId" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "jobId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "hoursWorked" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'jobber',
    "jobberTimesheetId" TEXT,
    "notes" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAdjustment" (
    "id" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "payPeriodStart" TIMESTAMP(3) NOT NULL,
    "payPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminApproval" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "address" TEXT,
    "serviceType" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "requestedDay" TEXT,
    "requestedTime" TEXT,
    "aiSummary" TEXT,
    "cleanerBroadcast" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "source" TEXT,
    "callTranscriptId" TEXT,
    "jobberJobId" TEXT,
    "jobberVisitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NextdoorLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "address" TEXT,
    "zipCode" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'nextdoor',
    "status" TEXT NOT NULL DEFAULT 'new',
    "autoReplied" BOOLEAN NOT NULL DEFAULT false,
    "autoReplyAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NextdoorLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "sqft" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'ai_discovery',
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "score" INTEGER NOT NULL DEFAULT 0,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedTo" TEXT,
    "aiInsights" TEXT,
    "metadata" JSONB,
    "openphoneContactId" TEXT,
    "openphoneSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 2,
    "dueDate" TIMESTAMP(3),
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "assignedTo" TEXT,
    "category" TEXT,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "checklist" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "event" TEXT,
    "label" TEXT,
    "value" TEXT,
    "metadata" JSONB,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "neighborhood" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSend" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'ten_gogreen',
    "subject" TEXT NOT NULL,
    "preview" TEXT,
    "source" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "receiptUrl" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paystub" (
    "id" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "grossPay" DOUBLE PRECISION NOT NULL,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reimbursements" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonuses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPay" DOUBLE PRECISION NOT NULL,
    "timesheetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "adjustmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "finalizedAt" TIMESTAMP(3),
    "finalizedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paystub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "sku" TEXT,
    "amazonAsin" TEXT,
    "amazonUrl" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'each',
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "reorderQty" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoReorder" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastOrderedAt" TIMESTAMP(3),
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'amazon',
    "amazonOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "trackingNumber" TEXT,
    "expectedDate" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "orderedBy" TEXT,
    "autoTriggered" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 10,
    "roleFilter" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "serviceRequestId" TEXT,
    "jobId" TEXT,
    "lineItems" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "address" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "lastRunDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "basePrice" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'stripe',
    "stripePaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT,
    "invoiceId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "stripeRefundId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minOrderAmount" DOUBLE PRECISION,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponUsage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "orderId" TEXT,
    "discountApplied" DOUBLE PRECISION NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "status" "ReviewRequestStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "reviewUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CancellationPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hoursBeforeJob" INTEGER NOT NULL,
    "feeType" "CancellationFeeType" NOT NULL,
    "feeValue" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerTeam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerTeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanerTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL,
    "audienceFilter" JSONB,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "EmailCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "replyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "customerEmail" TEXT,
    "sentiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'ten_gogreen',
    "cleanerId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanerLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "purchaserEmail" TEXT NOT NULL,
    "purchaserName" TEXT,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardUsage" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSignature" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'ten_gogreen',
    "direction" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'delivered',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerEmail" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'ten_gogreen',
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "threadId" TEXT,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "aiSummary" TEXT,
    "aiActionItems" JSONB,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "customerId" TEXT,
    "customerName" TEXT,
    "jobId" TEXT,
    "requestId" TEXT,
    "todoCreated" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimatePhoto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT,
    "sessionId" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimatePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referrerName" TEXT NOT NULL,
    "referrerEmail" TEXT NOT NULL,
    "referrerPhone" TEXT,
    "referralCode" TEXT NOT NULL,
    "referreeName" TEXT,
    "referreeEmail" TEXT,
    "referreePhone" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardType" TEXT NOT NULL DEFAULT 'credit',
    "rewardAmount" DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    "referreeDiscount" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "qualifiedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "jobId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CleanerProfile_userId_key" ON "CleanerProfile"("userId");

-- CreateIndex
CREATE INDEX "ServiceRequest_tenantId_status_idx" ON "ServiceRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ServiceRequest_tenantId_createdAt_idx" ON "ServiceRequest"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_customerEmail_idx" ON "ServiceRequest"("customerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_requestId_key" ON "Quote"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_requestId_key" ON "Job"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobberQuoteId_key" ON "Job"("jobberQuoteId");

-- CreateIndex
CREATE INDEX "Job_tenantId_status_idx" ON "Job"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Job_tenantId_scheduledStart_idx" ON "Job"("tenantId", "scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "JobAssignment_jobId_cleanerId_key" ON "JobAssignment"("jobId", "cleanerId");

-- CreateIndex
CREATE INDEX "PaymentRecord_requestId_status_idx" ON "PaymentRecord"("requestId", "status");

-- CreateIndex
CREATE INDEX "PaymentRecord_createdAt_idx" ON "PaymentRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_jobId_key" ON "CalendarEvent"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_tenantId_type_key" ON "Integration"("tenantId", "type");

-- CreateIndex
CREATE INDEX "CommunityPost_tenantId_audience_publishedAt_idx" ON "CommunityPost"("tenantId", "audience", "publishedAt");

-- CreateIndex
CREATE INDEX "CommunityPost_tenantId_category_publishedAt_idx" ON "CommunityPost"("tenantId", "category", "publishedAt");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityReaction_postId_createdAt_idx" ON "CommunityReaction"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReaction_postId_actorKey_reaction_key" ON "CommunityReaction"("postId", "actorKey", "reaction");

-- CreateIndex
CREATE INDEX "CommunityView_postId_createdAt_idx" ON "CommunityView"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityView_postId_actorKey_key" ON "CommunityView"("postId", "actorKey");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "CallTranscript_callId_key" ON "CallTranscript"("callId");

-- CreateIndex
CREATE INDEX "CallTranscript_tenantId_createdAt_idx" ON "CallTranscript"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CallTranscript_followUpNeeded_idx" ON "CallTranscript"("followUpNeeded");

-- CreateIndex
CREATE UNIQUE INDEX "Timesheet_jobberTimesheetId_key" ON "Timesheet"("jobberTimesheetId");

-- CreateIndex
CREATE INDEX "Timesheet_cleanerId_date_idx" ON "Timesheet"("cleanerId", "date");

-- CreateIndex
CREATE INDEX "PayrollAdjustment_cleanerId_payPeriodStart_idx" ON "PayrollAdjustment"("cleanerId", "payPeriodStart");

-- CreateIndex
CREATE INDEX "AdminApproval_status_idx" ON "AdminApproval"("status");

-- CreateIndex
CREATE INDEX "AdminApproval_type_idx" ON "AdminApproval"("type");

-- CreateIndex
CREATE INDEX "AdminApproval_createdAt_idx" ON "AdminApproval"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NextdoorLead_leadId_key" ON "NextdoorLead"("leadId");

-- CreateIndex
CREATE INDEX "NextdoorLead_tenantId_idx" ON "NextdoorLead"("tenantId");

-- CreateIndex
CREATE INDEX "CrmLead_tenantId_idx" ON "CrmLead"("tenantId");

-- CreateIndex
CREATE INDEX "CrmLead_status_idx" ON "CrmLead"("status");

-- CreateIndex
CREATE INDEX "CrmLead_priority_idx" ON "CrmLead"("priority");

-- CreateIndex
CREATE INDEX "CrmLead_score_idx" ON "CrmLead"("score");

-- CreateIndex
CREATE INDEX "CrmLead_nextFollowUpAt_idx" ON "CrmLead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "CrmLead_assignedTo_idx" ON "CrmLead"("assignedTo");

-- CreateIndex
CREATE INDEX "TodoItem_tenantId_idx" ON "TodoItem"("tenantId");

-- CreateIndex
CREATE INDEX "TodoItem_userId_idx" ON "TodoItem"("userId");

-- CreateIndex
CREATE INDEX "TodoItem_assignedTo_idx" ON "TodoItem"("assignedTo");

-- CreateIndex
CREATE INDEX "TodoItem_isShared_idx" ON "TodoItem"("isShared");

-- CreateIndex
CREATE INDEX "TodoItem_completed_idx" ON "TodoItem"("completed");

-- CreateIndex
CREATE INDEX "TodoItem_dueDate_idx" ON "TodoItem"("dueDate");

-- CreateIndex
CREATE INDEX "Note_tenantId_idx" ON "Note"("tenantId");

-- CreateIndex
CREATE INDEX "Note_userId_idx" ON "Note"("userId");

-- CreateIndex
CREATE INDEX "Note_isShared_idx" ON "Note"("isShared");

-- CreateIndex
CREATE INDEX "Note_relatedId_idx" ON "Note"("relatedId");

-- CreateIndex
CREATE INDEX "Note_pinned_idx" ON "Note"("pinned");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_idx" ON "AnalyticsEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_idx" ON "AnalyticsEvent"("type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_page_idx" ON "AnalyticsEvent"("page");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSend_tenantId_idx" ON "NewsletterSend"("tenantId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_date_idx" ON "Expense"("tenantId", "date");

-- CreateIndex
CREATE INDEX "Expense_tenantId_category_idx" ON "Expense"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Paystub_cleanerId_periodStart_idx" ON "Paystub"("cleanerId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "Paystub_cleanerId_periodStart_periodEnd_key" ON "Paystub"("cleanerId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_idx" ON "InventoryItem"("tenantId");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_category_idx" ON "InventoryItem"("tenantId", "category");

-- CreateIndex
CREATE INDEX "InventoryItem_amazonAsin_idx" ON "InventoryItem"("amazonAsin");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_tenantId_sku_key" ON "InventoryItem"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "SupplyOrder_tenantId_idx" ON "SupplyOrder"("tenantId");

-- CreateIndex
CREATE INDEX "SupplyOrder_tenantId_status_idx" ON "SupplyOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SupplyOrder_itemId_idx" ON "SupplyOrder"("itemId");

-- CreateIndex
CREATE INDEX "SupplyOrder_amazonOrderId_idx" ON "SupplyOrder"("amazonOrderId");

-- CreateIndex
CREATE INDEX "Achievement_roleFilter_idx" ON "Achievement"("roleFilter");

-- CreateIndex
CREATE INDEX "Achievement_tenantId_idx" ON "Achievement"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_tenantId_key_key" ON "Achievement"("tenantId", "key");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "XpEvent_userId_idx" ON "XpEvent"("userId");

-- CreateIndex
CREATE INDEX "XpEvent_eventType_idx" ON "XpEvent"("eventType");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_customerEmail_idx" ON "Invoice"("customerEmail");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "RecurringSchedule_tenantId_active_idx" ON "RecurringSchedule"("tenantId", "active");

-- CreateIndex
CREATE INDEX "RecurringSchedule_nextRunDate_idx" ON "RecurringSchedule"("nextRunDate");

-- CreateIndex
CREATE INDEX "Tip_tenantId_idx" ON "Tip"("tenantId");

-- CreateIndex
CREATE INDEX "Tip_cleanerId_idx" ON "Tip"("cleanerId");

-- CreateIndex
CREATE INDEX "Tip_jobId_idx" ON "Tip"("jobId");

-- CreateIndex
CREATE INDEX "Refund_tenantId_status_idx" ON "Refund"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Coupon_tenantId_idx" ON "Coupon"("tenantId");

-- CreateIndex
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_tenantId_code_key" ON "Coupon"("tenantId", "code");

-- CreateIndex
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");

-- CreateIndex
CREATE INDEX "CouponUsage_customerEmail_idx" ON "CouponUsage"("customerEmail");

-- CreateIndex
CREATE INDEX "ReviewRequest_tenantId_status_idx" ON "ReviewRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReviewRequest_jobId_idx" ON "ReviewRequest"("jobId");

-- CreateIndex
CREATE INDEX "CancellationPolicy_tenantId_idx" ON "CancellationPolicy"("tenantId");

-- CreateIndex
CREATE INDEX "JobCost_tenantId_idx" ON "JobCost"("tenantId");

-- CreateIndex
CREATE INDEX "JobCost_jobId_idx" ON "JobCost"("jobId");

-- CreateIndex
CREATE INDEX "CleanerTeam_tenantId_idx" ON "CleanerTeam"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CleanerTeamMember_teamId_cleanerId_key" ON "CleanerTeamMember"("teamId", "cleanerId");

-- CreateIndex
CREATE INDEX "CustomerAddress_tenantId_customerEmail_idx" ON "CustomerAddress"("tenantId", "customerEmail");

-- CreateIndex
CREATE INDEX "EmailCampaign_tenantId_status_idx" ON "EmailCampaign"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EmailCampaignRecipient_campaignId_idx" ON "EmailCampaignRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "EmailCampaignRecipient_email_idx" ON "EmailCampaignRecipient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleReview_reviewId_key" ON "GoogleReview"("reviewId");

-- CreateIndex
CREATE INDEX "GoogleReview_tenantId_idx" ON "GoogleReview"("tenantId");

-- CreateIndex
CREATE INDEX "GoogleReview_rating_idx" ON "GoogleReview"("rating");

-- CreateIndex
CREATE INDEX "CleanerLocation_tenantId_idx" ON "CleanerLocation"("tenantId");

-- CreateIndex
CREATE INDEX "CleanerLocation_cleanerId_recordedAt_idx" ON "CleanerLocation"("cleanerId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_tenantId_entityType_fieldName_key" ON "CustomFieldDefinition"("tenantId", "entityType", "fieldName");

-- CreateIndex
CREATE INDEX "CustomFieldValue_entityId_idx" ON "CustomFieldValue"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_definitionId_entityId_key" ON "CustomFieldValue"("definitionId", "entityId");

-- CreateIndex
CREATE INDEX "GiftCard_tenantId_idx" ON "GiftCard"("tenantId");

-- CreateIndex
CREATE INDEX "GiftCard_code_idx" ON "GiftCard"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_tenantId_code_key" ON "GiftCard"("tenantId", "code");

-- CreateIndex
CREATE INDEX "GiftCardUsage_giftCardId_idx" ON "GiftCardUsage"("giftCardId");

-- CreateIndex
CREATE INDEX "JobSignature_jobId_idx" ON "JobSignature"("jobId");

-- CreateIndex
CREATE INDEX "SmsMessage_tenantId_createdAt_idx" ON "SmsMessage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SmsMessage_fromNumber_idx" ON "SmsMessage"("fromNumber");

-- CreateIndex
CREATE INDEX "SmsMessage_toNumber_idx" ON "SmsMessage"("toNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerEmail_messageId_key" ON "CustomerEmail"("messageId");

-- CreateIndex
CREATE INDEX "CustomerEmail_tenantId_createdAt_idx" ON "CustomerEmail"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerEmail_tenantId_status_idx" ON "CustomerEmail"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CustomerEmail_fromEmail_idx" ON "CustomerEmail"("fromEmail");

-- CreateIndex
CREATE INDEX "CustomerEmail_customerId_idx" ON "CustomerEmail"("customerId");

-- CreateIndex
CREATE INDEX "CustomerEmail_jobId_idx" ON "CustomerEmail"("jobId");

-- CreateIndex
CREATE INDEX "CustomerEmail_category_idx" ON "CustomerEmail"("category");

-- CreateIndex
CREATE INDEX "CustomerEmail_messageId_idx" ON "CustomerEmail"("messageId");

-- CreateIndex
CREATE INDEX "JobPhoto_tenantId_jobId_idx" ON "JobPhoto"("tenantId", "jobId");

-- CreateIndex
CREATE INDEX "JobPhoto_jobId_type_idx" ON "JobPhoto"("jobId", "type");

-- CreateIndex
CREATE INDEX "EstimatePhoto_requestId_idx" ON "EstimatePhoto"("requestId");

-- CreateIndex
CREATE INDEX "EstimatePhoto_sessionId_idx" ON "EstimatePhoto"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referralCode_key" ON "Referral"("referralCode");

-- CreateIndex
CREATE INDEX "Referral_tenantId_status_idx" ON "Referral"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Referral_referralCode_idx" ON "Referral"("referralCode");

-- CreateIndex
CREATE INDEX "Referral_referrerEmail_idx" ON "Referral"("referrerEmail");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerProfile" ADD CONSTRAINT "CleanerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerSkill" ADD CONSTRAINT "CleanerSkill_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "CleanerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "CleanerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "CleanerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingPreference" ADD CONSTRAINT "SchedulingPreference_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerPayout" ADD CONSTRAINT "CleanerPayout_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerPayout" ADD CONSTRAINT "CleanerPayout_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "CleanerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReaction" ADD CONSTRAINT "CommunityReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityView" ADD CONSTRAINT "CommunityView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "CleanerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "CleanerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextdoorLead" ADD CONSTRAINT "NextdoorLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSend" ADD CONSTRAINT "NewsletterSend_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paystub" ADD CONSTRAINT "Paystub_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "CleanerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyOrder" ADD CONSTRAINT "SupplyOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerTeamMember" ADD CONSTRAINT "CleanerTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "CleanerTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerLocation" ADD CONSTRAINT "CleanerLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardUsage" ADD CONSTRAINT "GiftCardUsage_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.4.2                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘
