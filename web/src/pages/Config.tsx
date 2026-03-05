import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { UploadCloud, Save, RefreshCw, FileJson, Play, Edit, X } from 'lucide-react'
import { toast } from 'sonner'

interface ConfigsResponse {
    files: string[]
    active: string | null
}

export function Config() {
  const [configs, setConfigs] = useState<string[]>([])
  const [activeConfig, setActiveConfig] = useState<string | null>(null)

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingFileName, setEditingFileName] = useState<string | null>(null)
  const [configContent, setConfigContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadFileContent, setUploadFileContent] = useState('')

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchConfigs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/configs')
      if (response.ok) {
        const data: ConfigsResponse = await response.json()
        setConfigs(data.files)
        setActiveConfig(data.active)
      } else {
        throw new Error(`Failed to load configs: ${response.statusText}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred while fetching configs.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setConfigContent(value)
    }
  }

  const handleOpenEditor = async (filename: string) => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/config/${filename}`)
        if (response.ok) {
            const text = await response.text()
            setConfigContent(text)
            setOriginalContent(text)
            setEditingFileName(filename)
            setIsEditorOpen(true)
        } else {
            throw new Error(`Failed to load config file ${filename}: ${response.statusText}`)
        }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to open config.')
      } finally {
          setIsLoading(false)
      }
  }

  const handleSaveEditor = async () => {
    if (!editingFileName) return
    setIsSaving(true)
    try {
      try {
        JSON.parse(configContent)
      } catch {
        throw new Error('Invalid JSON format. Please fix errors before saving.')
      }

      const response = await fetch(`/api/config/${editingFileName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: configContent,
      })

      if (response.ok) {
        toast.success(`${editingFileName} saved successfully!`)
        setOriginalContent(configContent)
        setIsEditorOpen(false)
      } else {
        throw new Error(`Failed to save config: ${response.statusText}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApplyConfig = async (filename: string) => {
      setIsLoading(true)
      try {
          const response = await fetch('/api/config/apply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename })
          })

          if (response.ok) {
              toast.success(`Applied config ${filename} successfully!`)
              setActiveConfig(filename)
          } else {
              throw new Error(`Failed to apply config: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to apply config.')
      } finally {
          setIsLoading(false)
      }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        JSON.parse(content) // validate
        setUploadFileContent(content)

        let defaultName = file.name
        if (!defaultName.endsWith('.json')) {
            defaultName += '.json'
        }
        setUploadFileName(defaultName)
        setIsUploadOpen(true)
      } catch (err) {
        toast.error(`Failed to read or parse file: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
          if (fileInputRef.current) {
              fileInputRef.current.value = ''
          }
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read file.')
      if (fileInputRef.current) {
          fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleUploadSubmit = async () => {
      if (!uploadFileName.trim()) {
          toast.error("Filename cannot be empty.")
          return
      }

      let finalName = uploadFileName.trim()
      if (!finalName.endsWith('.json')) {
          finalName += '.json'
      }

      setIsSaving(true)
      try {
          const response = await fetch(`/api/config/${finalName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: uploadFileContent
          })
          if (response.ok) {
              toast.success(`Configuration ${finalName} uploaded successfully!`, {
                  description: 'Anyone with a link can now view this file.'
              })
              setIsUploadOpen(false)
              setUploadFileContent('')
              setUploadFileName('')
              fetchConfigs() // refresh list
          } else {
              throw new Error(`Failed to upload config: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Upload failed.')
      } finally {
          setIsSaving(false)
      }
  }

  const hasEditorChanges = configContent !== originalContent

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
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />

            <button
                onClick={fetchConfigs}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-md transition-colors"
                title="Reload Configs"
                disabled={isLoading}
            >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      {/* Configs List */}
      <div className="border border-zinc-800/50 rounded-lg overflow-hidden shadow-sm bg-[#09090b]">
          {configs.length === 0 && !isLoading ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                  No configuration files found. Upload one to get started.
              </div>
          ) : (
              <ul className="divide-y divide-zinc-800/50">
                  {configs.map((filename) => (
                      <li key={filename} className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors">
                          <div className="flex items-center gap-3">
                              <FileJson className="h-5 w-5 text-indigo-400" />
                              <span className="font-medium text-zinc-200">{filename}</span>
                              {activeConfig === filename && (
                                  <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                                      Active
                                  </span>
                              )}
                          </div>
                          <div className="flex items-center gap-2">
                              <button
                                  onClick={() => handleApplyConfig(filename)}
                                  disabled={isLoading || activeConfig === filename}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors shadow-sm ${
                                      activeConfig === filename
                                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                      : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20'
                                  }`}
                                  title="Apply this configuration"
                              >
                                  <Play className="h-3.5 w-3.5" />
                                  Apply
                              </button>
                              <button
                                  onClick={() => handleOpenEditor(filename)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800 hover:text-zinc-100 border border-zinc-700/50 rounded-md transition-colors shadow-sm"
                              >
                                  <Edit className="h-3.5 w-3.5" />
                                  Edit
                              </button>
                          </div>
                      </li>
                  ))}
              </ul>
          )}
      </div>

      {/* Upload Name Modal */}
      {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-[#18181b] border border-zinc-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center">
                      <h3 className="text-lg font-medium text-zinc-100">Upload Configuration</h3>
                      <button onClick={() => setIsUploadOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                          <X className="h-5 w-5" />
                      </button>
                  </div>
                  <div className="p-4 space-y-4">
                      <div>
                          <label htmlFor="filename" className="block text-sm font-medium text-zinc-400 mb-1">
                              Save file as:
                          </label>
                          <input
                              type="text"
                              id="filename"
                              value={uploadFileName}
                              onChange={(e) => setUploadFileName(e.target.value)}
                              className="w-full bg-[#09090b] border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                              autoFocus
                          />
                      </div>
                  </div>
                  <div className="p-4 bg-[#09090b] border-t border-zinc-800/50 flex justify-end gap-2">
                      <button
                          onClick={() => setIsUploadOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={handleUploadSubmit}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors shadow-sm disabled:opacity-50"
                      >
                          {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                          Save Upload
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <div className="flex flex-col w-full max-w-5xl h-full max-h-[90vh] bg-[#1e1e1e] border border-zinc-700 shadow-2xl rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-zinc-800/50 bg-[#252526]">
                      <div className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                          <Edit className="h-4 w-4 text-zinc-500" />
                          Editing: <span className="text-zinc-100">{editingFileName}</span>
                          {hasEditorChanges && <span className="text-indigo-400 ml-2 text-xs normal-case">(Unsaved changes)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                          <button
                              onClick={handleSaveEditor}
                              disabled={!hasEditorChanges || isSaving}
                              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors shadow-sm ${
                                  hasEditorChanges
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
                          <div className="w-px h-5 bg-zinc-700 mx-1"></div>
                          <button
                              onClick={() => {
                                  if (hasEditorChanges) {
                                      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                                          setIsEditorOpen(false)
                                      }
                                  } else {
                                      setIsEditorOpen(false)
                                  }
                              }}
                              className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-md transition-colors"
                              title="Close Editor"
                          >
                              <X className="h-4 w-4" />
                          </button>
                      </div>
                  </div>

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
              </div>
          </div>
      )}
    </div>
  )
}
