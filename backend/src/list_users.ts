import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://evxxymkctwhwhkqcpyao.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eHh5bWtjdHdod2hrcWNweWFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM5ODYxMSwiZXhwIjoyMDk1OTc0NjExfQ.tC-c9ZpkWUY-4ASbN5dElVbuR6PzC7LqJYHSQ4QpGoU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('--- ALL AUTH USERS ---');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error listing auth users:', authError.message);
  } else {
    users.forEach(u => {
      console.log(`Email: ${u.email} | ID: ${u.id} | Created: ${u.created_at}`);
    });
  }

  console.log('\n--- ALL CUSTOMERS TABLE RECORDS ---');
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('*');
  
  if (custError) {
    console.error('Error listing customers:', custError.message);
  } else {
    customers.forEach(c => {
      console.log(`ID: ${c.id} | Email: ${c.email} | Plan: ${c.plan} | Status: ${c.status}`);
    });
  }
}

run();
