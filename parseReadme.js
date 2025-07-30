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

(async () => {
  try {
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

  } catch (error) {
    console.error('❌ Error in main script:', error.message);
  }
})();
