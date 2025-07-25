import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md';

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
  const res = await fetch(URL);
  const text = await res.text();

  const lines = text.split('\n');
  const tableStart = lines.findIndex(line => line.includes('| Company |'));

  const data = [];
  let lastValidCompany = '';
  let lastValidCompanyLink = '';

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

    // ----- DEBUG -----
    console.log(`✅ Parsed row:`);
    console.log(`Company: ${company}`);
    console.log(`Role: ${role}`);
    console.log(`Location: ${location}`);
    console.log(`Apply: ${apply}`);
    console.log(`Company Link: ${companyLink}`);
    console.log(`Remote: ${isRemote} | Hybrid: ${isHybrid}`);
    console.log('-----------------------------');

    data.push({ company, role, location, apply, companyLink, isRemote, isHybrid });
  }

  console.log(`\n🎯 Finished parsing ${data.length} jobs`);
})();
