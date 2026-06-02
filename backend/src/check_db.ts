import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

async function checkConnection() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('Testing connection to Supabase...')
  console.log('URL:', url)
  console.log('Key length:', key ? key.length : 0)

  if (!url || !key) {
    console.error('❌ Supabase credentials not found in env.')
    return
  }

  const supabase = createClient(url, key)

  // 1. Check connection and fetch kpis table
  console.log('\n--- Checking kpis table ---')
  const { data: kpisData, error: kpisError } = await supabase
    .from('kpis')
    .select('*')
  
  if (kpisError) {
    console.error('❌ Error fetching kpis:', kpisError.message)
  } else {
    console.log('✅ Successfully fetched kpis! Count:', kpisData?.length)
    console.log('Sample:', kpisData)
  }

  // 2. Check monthly_metrics
  console.log('\n--- Checking monthly_metrics table ---')
  const { data: metricsData, error: metricsError } = await supabase
    .from('monthly_metrics')
    .select('*')
  
  if (metricsError) {
    console.error('❌ Error fetching monthly_metrics:', metricsError.message)
  } else {
    console.log('✅ Successfully fetched monthly_metrics! Count:', metricsData?.length)
  }

  // 3. Check plan_distribution
  console.log('\n--- Checking plan_distribution table ---')
  const { data: planData, error: planError } = await supabase
    .from('plan_distribution')
    .select('*')
  
  if (planError) {
    console.error('❌ Error fetching plan_distribution:', planError.message)
  } else {
    console.log('✅ Successfully fetched plan_distribution! Count:', planData?.length)
  }

  // 4. Check customers
  console.log('\n--- Checking customers table ---')
  const { data: customersData, error: customersError } = await supabase
    .from('customers')
    .select('*')
  
  if (customersError) {
    console.error('❌ Error fetching customers:', customersError.message)
  } else {
    console.log('✅ Successfully fetched customers! Count:', customersData?.length)
  }
}

checkConnection()
