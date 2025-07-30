-- Create the internships table
CREATE TABLE IF NOT EXISTS internships (
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

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_internships_company ON internships(company);
CREATE INDEX IF NOT EXISTS idx_internships_remote ON internships("is-remote");
CREATE INDEX IF NOT EXISTS idx_internships_created_at ON internships(created_at); 