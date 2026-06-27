import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evxxymkctwhwhkqcpyao.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eHh5bWtjdHdod2hrcWNweWFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5ODYxMSwiZXhwIjoyMDk1OTc0NjExfQ.tC-c9ZpkWUY-4ASbN5dElVbuR6PzC7LqJYHSQ4QpGoU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('--- SPREADSHEETS TABLE ---');
  const { data: sheets, error: sheetsError } = await supabase.from('spreadsheets').select('id, user_id, filename, created_at');
  if (sheetsError) console.error('Sheets error:', sheetsError.message);
  else console.log('Sheets:', sheets);

  console.log('--- DOCUMENTS TABLE ---');
  const { data: docs, error: docsError } = await supabase.from('documents').select('id, user_id, filename, created_at');
  if (docsError) console.error('Docs error:', docsError.message);
  else console.log('Docs:', docs);
}

run();
