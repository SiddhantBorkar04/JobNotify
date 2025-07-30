import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import twilio from 'https://esm.sh/twilio';

serve(async (req) => {
  try {
    const payload = await req.json();
    const internship = payload.record;

    console.log('📱 Processing SMS notification for:', internship.company);

    // Initialize Twilio client
    const twilioClient = twilio(
      Deno.env.get("TWILIO_ACCOUNT_SID"),
      Deno.env.get("TWILIO_AUTH_TOKEN")
    );

    // Create the message
    const msg = `🎯 New Internship Alert!\n\n🏢 Company: ${internship.company}\n💼 Role: ${internship.role}\n📍 Location: ${internship.location}\n🔗 Apply: ${internship['apply-link']}\n\nGood luck! 🚀`;

    // Send the SMS
    const message = await twilioClient.messages.create({
      body: msg,
      from: Deno.env.get("TWILIO_PHONE_NUMBER"),
      to: Deno.env.get("MY_PHONE"),
    });

    console.log('✅ SMS sent successfully:', message.sid);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'SMS sent successfully',
      sid: message.sid 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('❌ Error sending SMS:', err.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}); 