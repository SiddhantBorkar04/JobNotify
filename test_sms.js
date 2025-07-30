import { createClient } from '@supabase/supabase-js';

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Function to send SMS notification
async function sendSMSNotification(job) {
  try {
    console.log('📱 Sending SMS notification for:', job.company);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ record: job }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ SMS sent successfully:', result.sid);
    } else {
      console.error('❌ SMS failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
  }
}

// Test function
async function testSMS() {
  console.log('🧪 Testing SMS notification system...');
  
  const testJob = {
    company: 'Test Company',
    role: 'Software Engineer Intern',
    location: 'San Francisco, CA',
    'apply-link': 'https://test.com/apply'
  };

  await sendSMSNotification(testJob);
}

// Run the test
testSMS().catch(console.error); 