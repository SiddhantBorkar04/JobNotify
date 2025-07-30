import fetch from 'node-fetch';
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md';
const HASH_FILE = 'lastHash.txt';

(async () => {
  try {
    console.log('🔍 Checking for README updates...');
    
    const res = await fetch(URL);
    const content = await res.text();

    const currentHash = crypto.createHash('md5').update(content).digest('hex');

    let lastHash = '';
    if (existsSync(HASH_FILE)) {
      lastHash = readFileSync(HASH_FILE, 'utf-8');
    }

    if (currentHash !== lastHash) {
      console.log('🔔 README updated! Running parser...');
      
      try {
        // Run your parseReadme logic here
        execSync('node parseReadme.js', { stdio: 'inherit' });
        console.log('✅ Parser completed successfully!');
      } catch (parseError) {
        console.error('❌ Error running parser:', parseError.message);
      }

      writeFileSync(HASH_FILE, currentHash);
      console.log('💾 Updated hash file');
    } else {
      console.log('✅ No change in README. Skipping parse.');
    }
  } catch (error) {
    console.error('❌ Error checking README:', error.message);
  }
})();
