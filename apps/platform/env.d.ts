declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    DATABASE_URL?: string;
    SHADOW_DATABASE_URL?: string;

    // AI
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;

    // OpenPhone SMS
    OPENPHONE_API_KEY?: string;
    OPENPHONE_API_BASE_URL?: string;
    OPENPHONE_FROM?: string;
    OPENPHONE_HQ_NUMBERS?: string;
    OPENPHONE_DEFAULT_NUMBER?: string;
    OPENPHONE_ALERT_NUMBER?: string;

    // Google Calendar (legacy env var names used in lib/calendar.ts)
    GOOGLE_SERVICE_ACCOUNT?: string;
    GOOGLE_SERVICE_KEY?: string;
    GOOGLE_CALENDAR_ID?: string;
    GOOGLE_CALENDAR_CLIENT_EMAIL?: string;
    GOOGLE_CALENDAR_PRIVATE_KEY?: string;

    // Google Sheets sync (service account)
    GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
    GOOGLE_SERVICE_ACCOUNT_KEY?: string;
    GOOGLE_PROJECT_ID?: string;
    GOOGLE_PRIVATE_KEY_ID?: string;
    GOOGLE_CLIENT_ID?: string;

    // Email — SendGrid
    SENDGRID_API_KEY?: string;
    SENDGRID_FROM_EMAIL?: string;

    // Email — SMTP (Gmail)
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    SMTP_SECURE?: string;
    EMAIL_PROVIDER?: string;
    NEWSLETTER_FROM_EMAIL?: string;

    // Email — Resend
    RESEND_API_KEY?: string;

    // Stripe
    STRIPE_SECRET_KEY?: string;
    STRIPE_CONNECTED_ACCOUNT_ID?: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;

    // PayPal
    PAYPAL_CLIENT_ID?: string;
    PAYPAL_CLIENT_SECRET?: string;
    PAYPAL_ENV?: string;

    // Auth
    NEXTAUTH_SECRET?: string;
    NEXTAUTH_URL?: string;

    // Misc
    SLACK_WEBHOOK_URL?: string;
    CRON_SECRET?: string;
    NEXT_PUBLIC_BASE_URL?: string;
    NODE_ENV?: string;
  }
}
