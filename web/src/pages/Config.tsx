import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { UploadCloud, Save, RefreshCw, AlertCircle } from 'lucide-react'

export function Config() {
  const [configContent, setConfigContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchConfig = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const response = await fetch('/api/config')
      if (response.ok) {
        const text = await response.text()
        setConfigContent(text)
        setOriginalContent(text)
      } else if (response.status === 404) {
        // No config file yet, that's okay
        setConfigContent('{\n  \n}')
        setOriginalContent('{\n  \n}')
      } else {
        throw new Error(`Failed to load config: ${response.statusText}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching the config.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setConfigContent(value)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      // Basic JSON validation before saving
      try {
        JSON.parse(configContent)
      } catch {
        throw new Error('Invalid JSON format. Please fix errors before saving.')
      }

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: configContent,
      })

      if (response.ok) {
        setSuccessMessage('Configuration saved successfully!')
        setOriginalContent(configContent)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        throw new Error(`Failed to save config: ${response.statusText}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        // Basic JSON validation
        JSON.parse(content)
        setConfigContent(content)

        // Auto-save after upload
        setIsSaving(true)
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: content,
        })
        if (response.ok) {
            setSuccessMessage('Configuration uploaded and saved successfully!')
            setOriginalContent(content)
            setTimeout(() => setSuccessMessage(null), 3000)
        } else {
            throw new Error(`Failed to save config: ${response.statusText}`)
        }
      } catch (err) {
        setError(`Failed to read or parse file: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
          setIsSaving(false)
          if (fileInputRef.current) {
              fileInputRef.current.value = ''
          }
      }
    }
    reader.onerror = () => {
      setError('Failed to read file.')
      if (fileInputRef.current) {
          fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const hasChanges = configContent !== originalContent

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Configuration</h1>

        <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800 hover:text-zinc-100 border border-zinc-700/50 rounded-md transition-colors shadow-sm"
              disabled={isLoading || isSaving}
            >
              <UploadCloud className="h-4 w-4" />
              Upload Local Config
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            <button
                onClick={fetchConfig}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-md transition-colors"
                title="Reload Config"
                disabled={isLoading}
            >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="flex flex-col flex-1 h-[600px] border border-zinc-800/50 rounded-lg overflow-hidden shadow-sm bg-[#1e1e1e]">
        <div className="flex items-center justify-between p-3 border-b border-zinc-800/50 bg-[#252526]">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                config.json {hasChanges && <span className="text-indigo-400 normal-case tracking-normal ml-2">(Unsaved changes)</span>}
            </div>
            <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || isLoading}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors shadow-sm ${
                    hasChanges
                        ? 'bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
            >
                {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                    <Save className="h-4 w-4" />
                )}
                Save Changes
            </button>
        </div>

        {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
        ) : (
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme="vs-dark"
                    value={configContent}
                    onChange={handleEditorChange}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 },
                        formatOnPaste: true,
                        formatOnType: true,
                    }}
                />
            </div>
        )}
      </div>
    </div>
  )
}
