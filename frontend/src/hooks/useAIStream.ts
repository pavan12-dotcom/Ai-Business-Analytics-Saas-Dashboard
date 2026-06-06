import { useState, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface StreamOptions {
  question: string
  mode: 'spreadsheet' | 'document'
  onChunk?: (chunk: string) => void
  onDone?: (fullText: string) => void
  onError?: (err: string) => void
}

interface UseAIStreamReturn {
  streamedText: string
  isStreaming: boolean
  isDemoMode: boolean
  engine: string
  startStream: (opts: StreamOptions) => Promise<void>
  stopStream: () => void
  reset: () => void
}

export function useAIStream(): UseAIStreamReturn {
  const [streamedText, setStreamedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [engine, setEngine] = useState('gemini')
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setStreamedText('')
    setIsStreaming(false)
  }, [])

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const isGuest = localStorage.getItem('demo_guest_user') === 'true'
      if (isGuest) return 'demo-guest-token'
      const { supabase } = await import('../services/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token ?? null
    } catch {
      return null
    }
  }

  const startStream = useCallback(async ({ question, mode, onChunk, onDone, onError }: StreamOptions) => {
    if (isStreaming) return

    setStreamedText('')
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = await getAuthToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_BASE}/api/ai/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question, mode }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''

      // SSE streaming path
      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let engineName = 'gemini'
        let demo = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                // Stream complete
                setIsDemoMode(demo)
                setEngine(engineName)
                onDone?.(accumulated)
                setIsStreaming(false)
                return
              }
              try {
                const parsed = JSON.parse(data)
                if (parsed.chunk !== undefined) {
                  accumulated += parsed.chunk
                  setStreamedText(accumulated)
                  onChunk?.(parsed.chunk)
                }
                if (parsed.engine) engineName = parsed.engine
                if (parsed.demo !== undefined) demo = parsed.demo
              } catch {
                // Raw text chunk (non-JSON SSE)
                if (data.trim()) {
                  accumulated += data
                  setStreamedText(accumulated)
                  onChunk?.(data)
                }
              }
            }
          }
        }

        onDone?.(accumulated)
        setIsStreaming(false)
      } else {
        // Fallback: non-streaming JSON response — simulate streaming locally
        const json = await response.json()
        const fullText: string = json.answer || ''
        setIsDemoMode(!!json.demo)
        setEngine(json.engine || 'fallback')

        // Simulate streaming word by word
        const words = fullText.split(' ')
        let built = ''
        for (let i = 0; i < words.length; i++) {
          if (controller.signal.aborted) break
          built += (i === 0 ? '' : ' ') + words[i]
          setStreamedText(built)
          onChunk?.(words[i])
          await new Promise(r => setTimeout(r, 20))
        }

        onDone?.(built)
        setIsStreaming(false)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setIsStreaming(false)
        return
      }
      const msg = err.message || 'Stream failed'
      onError?.(msg)
      setIsStreaming(false)
    }
  }, [isStreaming])

  return { streamedText, isStreaming, isDemoMode, engine, startStream, stopStream, reset }
}
