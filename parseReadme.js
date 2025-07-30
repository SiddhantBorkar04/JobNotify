import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md';

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // or anon key for now
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanHTML(html) {
  return html
    .replace(/<\/?br\s*\/?>/gi, ', ')
    .replace(/<\/?details>/gi, '')
    .replace(/<\/?summary>.*?<\/summary>/gi, '')
    .replace(/<.*?>/g, '') // remove any remaining HTML tags
    .replace(/\s+/g, ' ')  // squish extra spaces
    .trim();
}

// Function to send SMS notification
async function sendSMSNotification(internship) {
  try {
    console.log('📱 Sending SMS notification for:', internship.company);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ record: internship }),
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

// Set up Realtime listener for new internships
function setupRealtimeListener() {
  console.log('🔔 Setting up Realtime listener for new internships...');
  
  supabase
    .channel('new-internship')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'internships'
      },
      async (payload) => {
        console.log('🆕 New internship detected:', payload.new.company);
        await sendSMSNotification(payload.new);
      }
    )
    .subscribe((status) => {
      console.log('📡 Realtime subscription status:', status);
    });
}

(async () => {
  try {
    // Set up Realtime listener first
    setupRealtimeListener();

    const res = await fetch(URL);
    const text = await res.text();

    const lines = text.split('\n');
    const tableStart = lines.findIndex(line => line.includes('| Company |'));

    const jobs = [];
    let lastValidCompany = '';
    let lastValidCompanyLink = '';

    console.log('🔍 Starting to parse internship data...');
    console.log(`📊 Found table starting at line ${tableStart}`);

    for (let i = tableStart + 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('|')) break;

      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 5) continue;

      let [_, companyRaw, role, locationRaw, applyRaw] = parts;

      // ----- COMPANY NAME & LINK -----
      let company = companyRaw === '↳' ? lastValidCompany : companyRaw;
      let companyLink = companyRaw === '↳' ? lastValidCompanyLink : null;

      const companyMatch = company.match(/\[(.*?)\]\((.*?)\)/); // [Text](Link)
      if (companyMatch) {
        company = companyMatch[1];
        companyLink = companyMatch[2];
      }

      company = company.replace(/\*\*/g, '').trim();
      lastValidCompany = company;
      lastValidCompanyLink = companyLink;

      // ----- LOCATION CLEANUP -----
      const location = cleanHTML(locationRaw);

      // ----- REMOTE / HYBRID TAGS -----
      const locationLower = location.toLowerCase();
      const isRemote = locationLower.includes('remote');
      const isHybrid = locationLower.includes('hybrid');

      // ----- APPLY LINK -----
      let apply = '';
      try {
        const $ = cheerio.load(applyRaw);
        $('a').each((_, el) => {
          const img = $(el).find('img');
          const imgAlt = img.attr('alt');
          const href = $(el).attr('href');
          if (imgAlt && imgAlt.toLowerCase().includes('apply') && href) {
            apply = href;
            return false;
          }
        });
      } catch (err) {
        console.log(`⚠️ Error parsing applyRaw: ${applyRaw}`);
      }

      // ----- DEBUG LOGGING -----
      console.log(`\n✅ Parsed job #${jobs.length + 1}:`);
      console.log(`   Company: ${company}`);
      console.log(`   Role: ${role}`);
      console.log(`   Location: ${location}`);
      console.log(`   Apply Link: ${apply}`);
      console.log(`   Remote: ${isRemote}, Hybrid: ${isHybrid}`);
      console.log('   ---');

      jobs.push({
        company,
        role,
        location,
        'apply-link': apply,
        'company-link': companyLink,
        'is-remote': isRemote,
        'is-hybrid': isHybrid,
      });
    }

    console.log(`\n🎯 Successfully parsed ${jobs.length} internship postings!`);
    console.log(`📋 First 3 jobs as example:`);
    console.log(JSON.stringify(jobs.slice(0, 3), null, 2));

    // ----- SUPABASE INSERT -----
    if (SUPABASE_URL && SUPABASE_KEY) {
      console.log('\n🚀 Attempting to insert jobs into Supabase...');
      
      try {
        const { data, error } = await supabase.from('internships').insert(jobs);
        if (error) throw error;
        console.log(`✅ Successfully inserted ${data.length} new records into Supabase!`);
        
        // The Realtime listener will automatically trigger SMS for new records
        console.log('📱 SMS notifications will be sent via Realtime listener');
        
      } catch (err) {
        console.error('❌ Supabase insert failed:', err.message);
        console.error('Make sure your environment variables are set correctly:');
        console.error('- SUPABASE_URL');
        console.error('- SUPABASE_SERVICE_ROLE_KEY');
        console.error('And that your "internships" table exists in Supabase.');
      }
    } else {
      console.log('\n⚠️ Supabase credentials not found in environment variables.');
      console.log('Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file or Railway environment variables.');
    }

    // Keep the process running to maintain Realtime connection
    console.log('\n🔄 Keeping process alive for Realtime notifications...');
    console.log('Press Ctrl+C to stop');
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error in main script:', error.message);
  }
})();
