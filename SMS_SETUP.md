# SMS Notification Setup Guide

This guide will help you set up real-time SMS notifications when new internships are added to your database.

## 🚀 Step 1: Set up Twilio

1. **Create a Twilio account** at https://www.twilio.com/
2. **Get your credentials:**
   - Account SID
   - Auth Token
   - Twilio phone number (for sending SMS)

## 🏗️ Step 2: Deploy the Edge Function

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
2. **Navigate to Edge Functions**
3. **Create a new function called `notify-sms`**
4. **Copy the code from `supabase/functions/notify-sms/index.ts`**
5. **Deploy the function**

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy notify-sms
```

## 🔧 Step 3: Set Environment Variables

In your Supabase dashboard, go to **Settings > Edge Functions** and add these secrets:

```bash
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
MY_PHONE=+1your_phone_number_here
```

## 🗄️ Step 4: Create the Database Trigger

1. **Go to your Supabase SQL Editor**
2. **Run the SQL from `supabase/triggers.sql`**
3. **Replace the placeholders:**
   - `YOUR_PROJECT_REF` with your actual project reference
   - `YOUR_ANON_KEY` with your anon key

## 🧪 Step 5: Test the Setup

1. **Insert a test record into your `internships` table:**
```sql
INSERT INTO internships (company, role, location, "apply-link", "is-remote", "is-hybrid")
VALUES ('Test Company', 'Test Role', 'Test Location', 'https://test.com', false, false);
```

2. **You should receive an SMS within seconds!**

## 📋 Required Database Table

Make sure your `internships` table has these columns:

```sql
CREATE TABLE internships (
  id SERIAL PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT NOT NULL,
  "apply-link" TEXT NOT NULL,
  "company-link" TEXT,
  "is-remote" BOOLEAN DEFAULT false,
  "is-hybrid" BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔍 Troubleshooting

### Common Issues:

1. **SMS not sending:**
   - Check Twilio credentials
   - Verify phone numbers are in correct format (+1XXXXXXXXXX)
   - Check Supabase Edge Function logs

2. **Trigger not firing:**
   - Verify the trigger is created in SQL Editor
   - Check that the `http` extension is enabled
   - Test with the `test_internship_notification()` function

3. **Edge Function errors:**
   - Check function logs in Supabase dashboard
   - Verify environment variables are set correctly

## 🎯 How it Works

1. **New internship inserted** → Database trigger fires
2. **Trigger calls Edge Function** → HTTP POST to `/notify-sms`
3. **Edge Function sends SMS** → Via Twilio API
4. **You get notified** → Within seconds of new job posting!

## 💰 Cost Considerations

- **Twilio:** ~$0.0075 per SMS (US numbers)
- **Supabase Edge Functions:** Free tier includes 500,000 invocations/month
- **Database:** Free tier includes 500MB storage

## 🔄 Next Steps

Once this is working, you can:
1. **Customize the SMS message format**
2. **Add filtering** (only remote jobs, specific companies, etc.)
3. **Add email notifications** as backup
4. **Create a webhook** for your React Native app 