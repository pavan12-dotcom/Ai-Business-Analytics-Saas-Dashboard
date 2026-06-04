const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env');
  process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
  console.log('Testing Supabase Connection...');
  console.log('URL:', url);

  try {
    const { data: kpis, error: kpiErr } = await supabase.from('kpis').select('*');
    if (kpiErr) {
      console.error('Error querying kpis:', kpiErr.message);
    } else {
      console.log('kpis table has', kpis.length, 'rows:');
      console.log(kpis);
    }

    const { data: monthly, error: monthlyErr } = await supabase.from('monthly_metrics').select('*');
    if (monthlyErr) {
      console.error('Error querying monthly_metrics:', monthlyErr.message);
    } else {
      console.log('monthly_metrics table has', monthly.length, 'rows:');
      console.log(monthly);
    }

    const { data: customers, error: custErr } = await supabase.from('customers').select('*');
    if (custErr) {
      console.error('Error querying customers:', custErr.message);
    } else {
      console.log('customers table has', customers.length, 'rows:');
      console.log(customers);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

test();
