import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

dotenv.config()

async function testGemini() {
  const key = process.env.GEMINI_API_KEY
  console.log('Gemini API Key:', key)
  console.log('Key length:', key ? key.length : 0)
  
  if (!key) {
    console.error('❌ GEMINI_API_KEY is not defined in env.')
    return
  }

  try {
    const genAI = new GoogleGenerativeAI(key)
    // Try each model in sequence
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash']
    for (const modelName of models) {
      console.log(`Sending test request to model: ${modelName}...`)
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent('Hello, respond with exactly "Gemini is working!" if you receive this.')
        console.log(`✅ Model ${modelName} succeeded! Response:`, result.response.text().trim())
        return
      } catch (err: any) {
        console.error(`❌ Model ${modelName} failed:`, err.message)
      }
    }
  } catch (err: any) {
    console.error('❌ Gemini Error:', err.message)
  }
}

testGemini()
