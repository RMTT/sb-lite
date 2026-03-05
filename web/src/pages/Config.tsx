import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { UploadCloud, Save, RefreshCw, FileJson, Play, Edit, X, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ConfigsResponse {
    files: string[]
    active: string | null
}

export interface Selector {
    name: string
    regex: string
    default: string
    interrupt_exist_connections: boolean
}

export interface CustomFieldsData {
    subscription_urls: string[]
    selectors: Selector[]
}

export function Config() {
  const [configs, setConfigs] = useState<string[]>([])
  const [activeConfig, setActiveConfig] = useState<string | null>(null)

  // Custom Fields State
  const [subscriptionUrls, setSubscriptionUrls] = useState<string[]>([])
  const [selectors, setSelectors] = useState<Selector[]>([])
  const [isSavingCustomFields, setIsSavingCustomFields] = useState(false)

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingFileName, setEditingFileName] = useState<string | null>(null)
  const [configContent, setConfigContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadFileContent, setUploadFileContent] = useState('')

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createFileName, setCreateFileName] = useState('')

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchConfigs = async () => {
    setIsLoading(true)
    try {
      const [configsRes, customFieldsRes] = await Promise.all([
          fetch('/api/configs'),
          fetch('/api/custom-fields')
      ])

      if (configsRes.ok) {
        const data: ConfigsResponse = await configsRes.json()
        setConfigs(data.files)
        setActiveConfig(data.active)
      } else {
        throw new Error(`Failed to load configs: ${configsRes.statusText}`)
      }

      if (customFieldsRes.ok) {
          const data: CustomFieldsData = await customFieldsRes.json()
          setSubscriptionUrls(data.subscription_urls || [])
          setSelectors(data.selectors || [])
      } else {
          throw new Error(`Failed to load custom fields: ${customFieldsRes.statusText}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred while fetching data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  const handleSaveCustomFields = async () => {
      setIsSavingCustomFields(true)
      try {
          const response = await fetch('/api/custom-fields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  subscription_urls: subscriptionUrls,
                  selectors: selectors
              })
          })

          if (response.ok) {
              toast.success('Custom fields saved successfully!')
          } else {
              throw new Error(`Failed to save custom fields: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to save custom fields.')
      } finally {
          setIsSavingCustomFields(false)
      }
  }

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

  const handleCreateSubmit = async () => {
      if (!createFileName.trim()) {
          toast.error("Filename cannot be empty.")
          return
      }

      let finalName = createFileName.trim()
      if (!finalName.endsWith('.json')) {
          finalName += '.json'
      }

      setIsSaving(true)
      try {
          const response = await fetch(`/api/config/${finalName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              // Send an empty JSON object to create a valid empty file
              body: "{\n\n}"
          })
          if (response.ok) {
              toast.success(`Configuration ${finalName} created successfully!`)
              setIsCreateOpen(false)
              setCreateFileName('')
              fetchConfigs() // refresh list

              // Automatically open the editor for the new file
              handleOpenEditor(finalName)
          } else {
              throw new Error(`Failed to create config: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to create config.')
      } finally {
          setIsSaving(false)
      }
  }

  const hasEditorChanges = configContent !== originalContent

  const sortedConfigs = [...configs].sort((a, b) => {
      if (a === activeConfig) return -1;
      if (b === activeConfig) return 1;
      return a.localeCompare(b);
  });

  const [newUrl, setNewUrl] = useState('')

  const handleAddUrl = () => {
      if (!newUrl.trim()) return
      setSubscriptionUrls([...subscriptionUrls, newUrl.trim()])
      setNewUrl('')
  }

  const handleRemoveUrl = (indexToRemove: number) => {
      setSubscriptionUrls(subscriptionUrls.filter((_, index) => index !== indexToRemove))
  }

  // Selector Form State
  const [newSelector, setNewSelector] = useState<Selector>({
      name: '',
      regex: '',
      default: '',
      interrupt_exist_connections: false
  })

  const handleAddSelector = () => {
      if (!newSelector.name.trim() || !newSelector.regex.trim()) {
          toast.error("Name and Regex are required fields.")
          return
      }
      setSelectors([...selectors, { ...newSelector, name: newSelector.name.trim(), regex: newSelector.regex.trim(), default: newSelector.default.trim() }])
      // Reset form
      setNewSelector({
          name: '',
          regex: '',
          default: '',
          interrupt_exist_connections: false
      })
  }

  const handleRemoveSelector = (indexToRemove: number) => {
      setSelectors(selectors.filter((_, index) => index !== indexToRemove))
  }

  return (
    <div className="space-y-8 pb-24">
      <h1 className="text-2xl font-semibold tracking-tight text-base-content">Configuration</h1>

      {/* Configs Card */}
      <div className="card bg-base-200 shadow-sm border border-base-300">
          <div className="card-body p-5 border-b border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                  <h2 className="text-lg font-medium text-base-content">Local Configurations</h2>
                  <p className="text-sm text-base-content/60 mt-1">Manage and select your sing-box configuration files.</p>
              </div>
              <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                        setCreateFileName('')
                        setIsCreateOpen(true)
                    }}
                    className="btn btn-sm btn-outline"
                    disabled={isLoading || isSaving}
                  >
                    <Plus className="h-4 w-4" />
                    New Config
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-sm btn-outline"
                    disabled={isLoading || isSaving}
                  >
                    <UploadCloud className="h-4 w-4" />
                    Upload
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
                      className="btn btn-sm btn-square btn-ghost"
                      title="Reload Configs"
                      disabled={isLoading}
                  >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
              </div>
          </div>
          <div className="bg-base-200">
              {configs.length === 0 && !isLoading ? (
                  <div className="p-8 text-center text-base-content/50 text-sm">
                      No configuration files found. Upload one to get started.
                  </div>
              ) : (
                  <ul className="divide-y divide-zinc-800/50 max-h-[35vh] overflow-y-auto custom-scrollbar">
                      {sortedConfigs.map((filename) => (
                          <li key={filename} className="flex items-center justify-between p-4 hover:bg-base-300/50 transition-colors">
                              <div className="flex items-center gap-3">
                                  <FileJson className="h-5 w-5 text-primary" />
                                  <span className="font-medium text-base-content/90">{filename}</span>
                                  {activeConfig === filename && (
                                      <span className="badge badge-success badge-sm badge-outline">
                                          Active
                                      </span>
                                  )}
                              </div>
                              <div className="flex items-center gap-2">
                                  <button
                                      onClick={() => handleApplyConfig(filename)}
                                      disabled={isLoading || activeConfig === filename}
                                      className={`btn btn-sm ${
                                          activeConfig === filename
                                          ? 'bg-base-300 text-base-content/50 cursor-not-allowed'
                                          : 'bg-primary/10 text-primary hover:bg-primary/20 border border-indigo-500/20'
                                       }`}
                                      title="Apply this configuration"
                                  >
                                      <Play className="h-3.5 w-3.5" />
                                      Apply
                                  </button>
                                  <button
                                      onClick={() => handleOpenEditor(filename)}
                                      disabled={isLoading}
                                      className="btn btn-sm btn-outline"
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
      </div>

      {/* Custom Fields Settings Card */}
      <div className="card bg-base-200 shadow-sm border border-base-300">
          <div className="card-body p-5 border-b border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                  <h2 className="text-lg font-medium text-base-content">Custom Settings</h2>
                  <p className="text-sm text-base-content/60 mt-1">Configure remote subscriptions and proxy selectors.</p>
              </div>
              <button
                  onClick={handleSaveCustomFields}
                  disabled={isSavingCustomFields}
                  className="btn btn-sm btn-primary"
              >
                  {isSavingCustomFields ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                      <Save className="h-4 w-4" />
                  )}
                  Sync changes
              </button>
          </div>

          <div className="p-5 space-y-8">
              {/* Subscription URLs Section */}
              <div className="space-y-4">
                  <h3 className="text-sm font-medium text-base-content/80">Subscription URLs</h3>
                  <div className="flex gap-2">
                      <input
                          type="text"
                          value={newUrl}
                          onChange={(e) => setNewUrl(e.target.value)}
                          placeholder="https://example.com/subscribe"
                          className="flex-1 bg-base-100 border border-base-300 rounded-md px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddUrl()
                          }}
                      />
                      <button
                          onClick={handleAddUrl}
                          disabled={!newUrl.trim()}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-base-300 text-base-content rounded-md hover:border-base-300 transition-colors shadow-sm disabled:opacity-50"
                      >
                          <Plus className="h-4 w-4" />
                          Add URL
                      </button>
                  </div>

                  {subscriptionUrls.length === 0 ? (
                      <div className="text-sm text-base-content/50 text-center py-4 bg-base-100/50 rounded-md border border-base-300">
                          No subscription URLs added yet.
                      </div>
                  ) : (
                      <ul className="space-y-2">
                          {subscriptionUrls.map((url, idx) => (
                              <li key={idx} className="flex items-center justify-between bg-base-100 border border-zinc-800 rounded-md px-3 py-2 text-sm">
                                  <span className="text-base-content/80 truncate mr-4">{url}</span>
                                  <div className="flex items-center gap-2">
                                      <button
                                          type="button"
                                          className="text-base-content/50 hover:text-primary transition-colors shrink-0 p-1.5 rounded-md hover:bg-base-300"
                                          title="Update Subscription"
                                      >
                                          <RefreshCw className="h-4 w-4" />
                                      </button>
                                      <button
                                          onClick={() => handleRemoveUrl(idx)}
                                          className="text-base-content/50 hover:text-red-400 transition-colors shrink-0 p-1.5 rounded-md hover:bg-base-300"
                                          title="Remove URL"
                                      >
                                          <Trash2 className="h-4 w-4" />
                                      </button>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  )}
              </div>

              <div className="h-px bg-base-300 w-full" />

              {/* Selectors Section */}
              <div className="space-y-4">
                  <h3 className="text-sm font-medium text-base-content/80">Selectors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-base-100 p-4 rounded-lg border border-zinc-800">
                      <div className="space-y-1 lg:col-span-1">
                          <label className="text-xs font-medium text-base-content/60">Name</label>
                          <input
                              type="text"
                              value={newSelector.name}
                              onChange={(e) => setNewSelector({...newSelector, name: e.target.value})}
                              placeholder="e.g. US Nodes"
                              className="w-full bg-base-200 border border-base-300 rounded-md px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                          />
                      </div>
                      <div className="space-y-1 lg:col-span-1">
                          <label className="text-xs font-medium text-base-content/60">Regex</label>
                          <input
                              type="text"
                              value={newSelector.regex}
                              onChange={(e) => setNewSelector({...newSelector, regex: e.target.value})}
                              placeholder="e.g. .*US.*"
                              className="w-full bg-base-200 border border-base-300 rounded-md px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                          />
                      </div>
                      <div className="space-y-1 lg:col-span-1">
                          <label className="text-xs font-medium text-base-content/60">Default (Optional)</label>
                          <input
                              type="text"
                              value={newSelector.default}
                              onChange={(e) => setNewSelector({...newSelector, default: e.target.value})}
                              placeholder="Fallback tag"
                              className="w-full bg-base-200 border border-base-300 rounded-md px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                          />
                      </div>
                      <div className="space-y-1 lg:col-span-1 flex items-center h-full justify-center">
                          <label className="flex items-center gap-2 cursor-pointer mb-0">
                              <input
                                  type="checkbox"
                                  checked={newSelector.interrupt_exist_connections}
                                  onChange={(e) => setNewSelector({...newSelector, interrupt_exist_connections: e.target.checked})}
                                  className="w-4 h-4 rounded border-base-300 bg-base-200 text-primary focus:ring-indigo-500/50 focus:ring-offset-0"
                              />
                              <span className="text-xs font-medium text-base-content/60 select-none">Interrupt connections</span>
                          </label>
                      </div>
                      <div className="lg:col-span-1">
                          <button
                              onClick={handleAddSelector}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-base-300 text-base-content rounded-md hover:border-base-300 transition-colors shadow-sm"
                          >
                              <Plus className="h-4 w-4" />
                              Add
                          </button>
                      </div>
                  </div>

                  {selectors.length === 0 ? (
                      <div className="text-sm text-base-content/50 text-center py-4 bg-base-100/50 rounded-md border border-base-300">
                          No selectors added yet.
                      </div>
                  ) : (
                      <div className="overflow-x-auto rounded-md border border-zinc-800">
                          <table className="w-full text-sm text-left">
                              <thead className="text-xs text-base-content/60 bg-base-100 border-b border-zinc-800">
                                  <tr>
                                      <th className="px-4 py-3 font-medium">Name</th>
                                      <th className="px-4 py-3 font-medium">Regex</th>
                                      <th className="px-4 py-3 font-medium">Default</th>
                                      <th className="px-4 py-3 font-medium text-center">Interrupt</th>
                                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/50 bg-base-200/50">
                                  {selectors.map((sel, idx) => (
                                      <tr key={idx} className="hover:bg-base-300/50 transition-colors">
                                          <td className="px-4 py-2.5 text-base-content/90">{sel.name}</td>
                                          <td className="px-4 py-2.5 text-base-content/60 font-mono text-xs">{sel.regex}</td>
                                          <td className="px-4 py-2.5 text-base-content/60">{sel.default || '-'}</td>
                                          <td className="px-4 py-2.5 text-center">
                                              {sel.interrupt_exist_connections ? (
                                                  <span className="text-emerald-400 font-medium">Yes</span>
                                              ) : (
                                                  <span className="text-base-content/50">No</span>
                                              )}
                                          </td>
                                          <td className="px-4 py-2.5 text-right">
                                              <button
                                                  onClick={() => handleRemoveSelector(idx)}
                                                  className="text-base-content/50 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-base-300"
                                                  title="Remove Selector"
                                              >
                                                  <Trash2 className="h-4 w-4" />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Upload Name Modal */}
      {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-base-100 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-base-300 flex justify-between items-center">
                      <h3 className="text-lg font-medium text-base-content">Upload Configuration</h3>
                      <button onClick={() => setIsUploadOpen(false)} className="text-base-content/60 hover:text-base-content">
                          <X className="h-5 w-5" />
                      </button>
                  </div>
                  <div className="p-4 space-y-4">
                      <div>
                          <label htmlFor="filename" className="block text-sm font-medium text-base-content/60 mb-1">
                              Save file as:
                          </label>
                          <input
                              type="text"
                              id="filename"
                              value={uploadFileName}
                              onChange={(e) => setUploadFileName(e.target.value)}
                              className="w-full bg-base-200 border border-base-300 rounded-md px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                              autoFocus
                          />
                      </div>
                  </div>
                  <div className="p-4 bg-base-200 border-t border-base-300 flex justify-end gap-2">
                      <button
                          onClick={() => setIsUploadOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-base-content/60 hover:text-base-content transition-colors"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={handleUploadSubmit}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-focus transition-colors shadow-sm disabled:opacity-50"
                      >
                          {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                          Save Upload
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Create Name Modal */}
      {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-base-100 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-base-300 flex justify-between items-center">
                      <h3 className="text-lg font-medium text-base-content">Create Configuration</h3>
                      <button onClick={() => setIsCreateOpen(false)} className="text-base-content/60 hover:text-base-content">
                          <X className="h-5 w-5" />
                      </button>
                  </div>
                  <div className="p-4 space-y-4">
                      <div>
                          <label htmlFor="createFileName" className="block text-sm font-medium text-base-content/60 mb-1">
                              New filename:
                          </label>
                          <input
                              type="text"
                              id="createFileName"
                              value={createFileName}
                              onChange={(e) => setCreateFileName(e.target.value)}
                              className="w-full bg-base-200 border border-base-300 rounded-md px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                              placeholder="e.g., custom-config.json"
                              autoFocus
                          />
                      </div>
                  </div>
                  <div className="p-4 bg-base-200 border-t border-base-300 flex justify-end gap-2">
                      <button
                          onClick={() => setIsCreateOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-base-content/60 hover:text-base-content transition-colors"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={handleCreateSubmit}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-focus transition-colors shadow-sm disabled:opacity-50"
                      >
                          {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                          Create
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <div className="flex flex-col w-full max-w-5xl h-full max-h-[90vh] bg-[#1e1e1e] border border-base-300 shadow-2xl rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-base-300 bg-[#252526]">
                      <div className="text-sm font-medium text-base-content/80 flex items-center gap-2">
                          <Edit className="h-4 w-4 text-base-content/50" />
                          Editing: <span className="text-base-content">{editingFileName}</span>
                          {hasEditorChanges && <span className="text-primary ml-2 text-xs normal-case">(Unsaved changes)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                          <button
                              onClick={handleSaveEditor}
                              disabled={!hasEditorChanges || isSaving}
                              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors shadow-sm ${
                                  hasEditorChanges
                                      ? 'bg-primary text-white hover:bg-primary-focus disabled:opacity-50'
                                      : 'bg-base-300 text-base-content/50 cursor-not-allowed'
                              }`}
                          >
                              {isSaving ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                  <Save className="h-4 w-4" />
                              )}
                              Save Changes
                          </button>
                          <div className="w-px h-5 border-base-300 mx-1"></div>
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
                              className="btn btn-sm btn-square btn-ghost"
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
