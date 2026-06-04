/**
 * Syncs all required environment variables to Vercel frontend project
 * Uses Vercel REST API to set/update env vars
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// Read the Vercel project info
const projectJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../frontend/.vercel/project.json'), 'utf8'))
const { projectId, orgId } = projectJson

console.log('Frontend Project ID:', projectId)
console.log('Org ID:', orgId)

// Read the vercel token from environment
const token = process.env.VERCEL_TOKEN

if (!token) {
  console.error('❌ VERCEL_TOKEN environment variable not set!')
  console.log('\nTo get your token:')
  console.log('1. Go to https://vercel.com/account/tokens')
  console.log('2. Create a new token')
  console.log('3. Run: $env:VERCEL_TOKEN="your-token-here"; node sync-vercel-env.js')
  process.exit(1)
}

const envVars = [
  { key: 'VITE_API_URL', value: 'https://business-analytics-with-ai.vercel.app' },
  { key: 'VITE_SUPABASE_URL', value: 'https://evxxymkctwhwhkqcpyao.supabase.co' },
  { key: 'VITE_SUPABASE_ANON_KEY', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eHh5bWtjdHdod2hrcWNweWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzOTg2MTEsImV4cCI6MjA5NTk3NDYxMX0.Xf1cDp94VpXkJvGeMUNC9wHsASFa_IDo0xh6HNKpVXM' },
  { key: 'VITE_STRIPE_PUBLISHABLE_KEY', value: 'pk_test_51TduyCFd4pOyjW8ZUIgs3A0YgZg5s7uNpbfC2eIaPS7WcFhOPIXBm0Ygy43wus4RHPdegBiv7HruEHy9vBUsK5YL00nsXF2Sfd' },
]

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'api.vercel.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', chunk => responseData += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseData) })
        } catch {
          resolve({ status: res.statusCode, body: responseData })
        }
      })
    })

    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function main() {
  const teamQuery = orgId.startsWith('team_') ? `?teamId=${orgId}` : ''

  // First, get existing env vars
  console.log('\n📋 Fetching existing env vars...')
  const existing = await makeRequest('GET', `/v9/projects/${projectId}/env${teamQuery}`)
  
  if (existing.status !== 200) {
    console.error('❌ Failed to fetch env vars:', existing.body)
    return
  }

  const existingKeys = {}
  for (const env of (existing.body.envs || [])) {
    existingKeys[env.key] = env.id
  }

  console.log('Existing keys:', Object.keys(existingKeys))

  for (const { key, value } of envVars) {
    if (existingKeys[key]) {
      // Update existing
      console.log(`🔄 Updating ${key}...`)
      const res = await makeRequest('PATCH', `/v9/projects/${projectId}/env/${existingKeys[key]}${teamQuery}`, {
        value,
        target: ['production', 'preview', 'development']
      })
      if (res.status === 200) {
        console.log(`  ✅ Updated ${key}`)
      } else {
        console.error(`  ❌ Failed to update ${key}:`, res.body)
      }
    } else {
      // Create new
      console.log(`➕ Creating ${key}...`)
      const res = await makeRequest('POST', `/v9/projects/${projectId}/env${teamQuery}`, {
        key,
        value,
        type: 'plain',
        target: ['production', 'preview', 'development']
      })
      if (res.status === 200 || res.status === 201) {
        console.log(`  ✅ Created ${key}`)
      } else {
        console.error(`  ❌ Failed to create ${key}:`, JSON.stringify(res.body))
      }
    }
  }

  console.log('\n✅ Done! Now redeploy the frontend for changes to take effect.')
  console.log('Run: npx vercel --prod --yes (in the frontend folder)')
}

main().catch(console.error)
