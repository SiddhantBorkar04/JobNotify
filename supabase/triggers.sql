-- Enable the http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS "http";

-- Function to notify when a new internship is inserted
CREATE OR REPLACE FUNCTION notify_new_internship()
RETURNS TRIGGER AS $$
BEGIN
  -- Make HTTP POST request to our Edge Function
  PERFORM
    net.http_post(
      url := 'https://ymofwlgycxcvtdberymd.supabase.co/functions/v1/notify-sms',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}',
      body := json_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS on_new_internship ON internships;
CREATE TRIGGER on_new_internship
  AFTER INSERT ON internships
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_internship();

-- Optional: Create a function to test the trigger
CREATE OR REPLACE FUNCTION test_internship_notification()
RETURNS void AS $$
BEGIN
  -- Insert a test record to trigger the notification
  INSERT INTO internships (company, role, location, "apply-link", "is-remote", "is-hybrid")
  VALUES ('Test Company', 'Test Role', 'Test Location', 'https://test.com', false, false);
END;
$$ LANGUAGE plpgsql; 