import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { UploadCloud, RefreshCw, FileJson, Edit, X, Plus, Trash2, Share, FileText, Search, MoreVertical, Link2 } from 'lucide-react'
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

export interface Subscription {
    url: string
    prefix?: string
    last_fetched: string | null
    raw_data: string | null
}

export interface CustomFieldsData {
    subscriptions: Subscription[]
    selectors: Selector[]
}

export function Config() {
  const [configs, setConfigs] = useState<string[]>([])
  const [activeConfig, setActiveConfig] = useState<string | null>(null)
  const [updatingIndex, setUpdatingIndex] = useState<number | null>(null)
  const [isAddingUrl, setIsAddingUrl] = useState(false)

  // Custom Fields State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectors, setSelectors] = useState<Selector[]>([])
  const [, setIsSavingCustomFields] = useState(false)

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
  const [configToDelete, setConfigToDelete] = useState<string | null>(null)
  const [isMergedEditorOpen, setIsMergedEditorOpen] = useState(false)
  const [mergedConfigContent, setMergedConfigContent] = useState('')

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
          setSubscriptions(data.subscriptions || [])
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


  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setConfigContent(value)
    }
  }

  const handleOpenMergedConfig = async () => {
      setIsLoading(true)
      try {
          const response = await fetch('/api/config/merged')
          if (response.ok) {
              const text = await response.text()
              setMergedConfigContent(text)
              setIsMergedEditorOpen(true)
          } else if (response.status === 404) {
              toast.error('Merged config not found. Apply a config or update custom settings first.')
          } else {
              throw new Error(`Failed to load merged config: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to load merged config.')
      } finally {
          setIsLoading(false)
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

  const handleDeleteConfig = async () => {
      if (!configToDelete) return
      setIsSaving(true)
      try {
          const response = await fetch(`/api/config/${configToDelete}`, {
              method: 'DELETE',
          })
          if (response.ok) {
              toast.success(`Configuration ${configToDelete} deleted!`)
              setConfigToDelete(null)
              fetchConfigs() // refresh list
          } else {
              throw new Error(`Failed to delete config: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to delete config.')
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
  const [newPrefix, setNewPrefix] = useState('')

  const handleAddUrl = async () => {
      const urlToAdd = newUrl.trim()
      if (!urlToAdd) return

      if (subscriptions.some(sub => sub.url === urlToAdd)) {
          toast.error("This subscription URL has already been added.")
          return
      }

      setIsAddingUrl(true)
      try {
          // Validate the URL first
          const valRes = await fetch('/api/subscriptions/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: urlToAdd })
          })

          if (!valRes.ok) {
              let msg = valRes.statusText
              try {
                  const errorText = await valRes.text()
                  if (errorText) msg = errorText
              } catch { console.error("Error reading text"); }
              throw new Error(msg)
          }

          const validationData = await valRes.json()

          const newSub: Subscription = {
              url: urlToAdd,
              prefix: newPrefix.trim() || undefined,
              last_fetched: validationData.last_fetched,
              raw_data: validationData.raw_data
          }
          const updatedSubs = [...subscriptions, newSub]
          setSubscriptions(updatedSubs)
          setNewUrl('')
          setNewPrefix('')

          setIsSavingCustomFields(true)
          const response = await fetch('/api/custom-fields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  subscriptions: updatedSubs,
                  selectors: selectors
              })
          })

          if (response.ok) {
              toast.success('Subscription validated and added!')
              fetchConfigs() // reload
          } else {
              throw new Error(`Failed to save custom fields: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to add subscription.')
      } finally {
          setIsAddingUrl(false)
          setIsSavingCustomFields(false)
      }
  }

  const handleUpdateSubscription = async (index: number) => {
      setUpdatingIndex(index)
      try {
          const response = await fetch(`/api/subscriptions/${index}/update`, {
              method: 'POST',
          })
          if (response.ok) {
              toast.success('Subscription updated!')
              fetchConfigs() // Refresh
          } else {
              throw new Error(`Failed to update subscription: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to update subscription.')
      } finally {
          setUpdatingIndex(null)
      }
  }
  const handleRemoveUrl = async (indexToRemove: number) => {
      const updatedSubs = subscriptions.filter((_, index) => index !== indexToRemove)
      setSubscriptions(updatedSubs)

      setIsSavingCustomFields(true)
      try {
          const response = await fetch('/api/custom-fields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  subscriptions: updatedSubs,
                  selectors: selectors
              })
          })

          if (!response.ok) {
              throw new Error(`Failed to save custom fields: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to save custom fields.')
      } finally {
          setIsSavingCustomFields(false)
      }
  }

  // Selector Form State
  const [newSelector, setNewSelector] = useState<Selector>({
      name: '',
      regex: '',
      default: '',
      interrupt_exist_connections: false
  })

  const handleAddSelector = async () => {
      if (!newSelector.name.trim() || !newSelector.regex.trim()) {
          toast.error("Name and Regex are required fields.")
          return
      }
      const newSel = { ...newSelector, name: newSelector.name.trim(), regex: newSelector.regex.trim(), default: newSelector.default.trim() }
      const updatedSelectors = [...selectors, newSel]
      setSelectors(updatedSelectors)
      // Reset form
      setNewSelector({
          name: '',
          regex: '',
          default: '',
          interrupt_exist_connections: false
      })

      setIsSavingCustomFields(true)
      try {
          const response = await fetch('/api/custom-fields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  subscriptions: subscriptions,
                  selectors: updatedSelectors
              })
          })

          if (!response.ok) {
              throw new Error(`Failed to save custom fields: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to save custom fields.')
      } finally {
          setIsSavingCustomFields(false)
      }
  }

  const handleRemoveSelector = async (indexToRemove: number) => {
      const updatedSelectors = selectors.filter((_, index) => index !== indexToRemove)
      setSelectors(updatedSelectors)

      setIsSavingCustomFields(true)
      try {
          const response = await fetch('/api/custom-fields', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  subscriptions: subscriptions,
                  selectors: updatedSelectors
              })
          })

          if (!response.ok) {
              throw new Error(`Failed to save custom fields: ${response.statusText}`)
          }
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to save custom fields.')
      } finally {
          setIsSavingCustomFields(false)
      }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold tracking-tight text-white">Configuration</h1>
        <div className="flex gap-4 text-zinc-400">
            <Search className="h-4 w-4" />
            <MoreVertical className="h-4 w-4" />
        </div>
      </div>

      {/* Configs Card */}
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                  <h2 className="text-lg font-semibold text-white">Local Configurations</h2>
                  <p className="text-sm text-zinc-400 mt-1">Manage and select your sing-box configuration files.</p>
              </div>
              <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white border border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                    disabled={isLoading || isSaving}
                  >
                    <UploadCloud className="h-4 w-4" />
                    Upload
                  </button>
                  <button
                    onClick={() => {
                        setCreateFileName('')
                        setIsCreateOpen(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    disabled={isLoading || isSaving}
                  >
                    <Plus className="h-4 w-4" />
                    New Config
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".json"
                    className="hidden"
                  />
              </div>
          </div>
          <div className="bg-transparent">
              {configs.length === 0 && !isLoading ? (
                  <div className="p-8 text-center text-zinc-500 text-sm">
                      No configuration files found. Upload one to get started.
                  </div>
              ) : (
                  <ul className="divide-y divide-zinc-800/50 max-h-[35vh] overflow-y-auto custom-scrollbar">
                      {sortedConfigs.map((filename) => (
                          <li key={filename} className={`flex items-center justify-between p-4 px-6 transition-colors ${activeConfig === filename ? 'bg-zinc-800/30' : 'hover:bg-zinc-800/10'}`}>
                              <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                      <FileText className="h-5 w-5 text-blue-500" />
                                  </div>
                                  <div>
                                      <div className="flex items-center gap-3 mb-1">
                                          <span className="font-medium text-zinc-200">{filename}</span>
                                          {activeConfig === filename && (
                                              <div className="flex items-center gap-1.5">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                                  <span className="text-xs font-semibold text-emerald-500 tracking-wide">Active</span>
                                              </div>
                                          )}
                                      </div>
                                      <div className="text-xs text-zinc-500 flex items-center gap-2">
                                          <span>Modified recently</span>
                                          <span className="text-zinc-700">&bull;</span>
                                          <span>-- kb</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  {activeConfig !== filename && (
                                      <button
                                          onClick={() => handleApplyConfig(filename)}
                                          disabled={isLoading}
                                          className="text-xs font-medium px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                                      >
                                          Apply
                                      </button>
                                  )}
                                  <button
                                      onClick={() => handleOpenEditor(filename)}
                                      disabled={isLoading}
                                      className="p-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                  >
                                      <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                      onClick={() => setConfigToDelete(filename)}
                                      disabled={isLoading || activeConfig === filename}
                                      className="p-2 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                      title={activeConfig === filename ? "Cannot delete active config" : "Delete Configuration"}
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </button>
                              </div>
                          </li>
                      ))}
                  </ul>
              )}
          </div>
      </div>

      {/* Custom Fields Settings Card */}
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                  <h2 className="text-lg font-semibold text-white">Custom Settings</h2>
                  <p className="text-sm text-zinc-400 mt-1">Configure remote subscriptions and proxy selectors.</p>
              </div>
              <button
                  onClick={handleOpenMergedConfig}
                  disabled={isLoading}
                  className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
                  title="Show merged config"
              >
                  <Share className="h-4 w-4" />
              </button>
          </div>

          <div className="p-6 space-y-10">
              {/* Subscription URLs Section */}
              <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Subscription URLs</h3>
                  <div className="flex gap-3 items-center">
                      <div className="flex-1 relative">
                          <input
                              type="text"
                              value={newUrl}
                              onChange={(e) => setNewUrl(e.target.value)}
                              placeholder="Subscription URL (https://...)"
                              className="w-full bg-[#0c0c0e] border border-zinc-800/80 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddUrl()
                              }}
                          />
                      </div>
                      <div className="w-32 relative">
                          <input
                              type="text"
                              value={newPrefix}
                              onChange={(e) => setNewPrefix(e.target.value)}
                              placeholder="Prefix (e.g. US)"
                              className="w-full bg-[#0c0c0e] border border-zinc-800/80 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddUrl()
                              }}
                          />
                      </div>
                      <button
                          onClick={handleAddUrl}
                          disabled={!newUrl.trim() || isAddingUrl}
                          className="px-6 py-2.5 text-sm font-medium bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 active:scale-95 transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
                      >
                          {isAddingUrl ? 'Adding...' : 'Add'}
                      </button>
                  </div>

                  {subscriptions.length === 0 ? (
                      <div className="text-sm text-zinc-600 text-center py-6 bg-zinc-950/30 rounded-lg border border-zinc-800/30">
                          No subscriptions added.
                      </div>
                  ) : (
                      <ul className="space-y-3">
                          {subscriptions.map((sub, idx) => (
                              <li key={idx} className="flex items-center justify-between bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm group">
                                  <div className="flex items-center gap-4 truncate">
                                      <div className="h-8 w-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                          <Link2 className="h-4 w-4 text-zinc-400" />
                                      </div>
                                      <div className="flex flex-col truncate">
                                          <div className="flex items-center gap-2 truncate">
                                              <span className="text-zinc-300 font-medium truncate">{sub.url}</span>
                                              {sub.prefix && (
                                                  <span className="px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-500 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                                      {sub.prefix}
                                                  </span>
                                              )}
                                          </div>
                                          <span className="text-xs text-zinc-500 mt-0.5">
                                              Last fetched: {sub.last_fetched ? 'Just now' : 'Never'} &bull; Status: <span className="text-emerald-500">Success</span>
                                          </span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                          onClick={() => handleUpdateSubscription(idx)}
                                          type="button"
                                          disabled={updatingIndex === idx}
                                          className="text-zinc-500 hover:text-white p-2 rounded hover:bg-zinc-800 transition-colors disabled:opacity-50"
                                          title="Update Subscription"
                                      >
                                          <RefreshCw className={`h-4 w-4 ${updatingIndex === idx ? 'animate-spin' : ''}`} />
                                      </button>
                                      <button
                                          onClick={() => handleRemoveUrl(idx)}
                                          className="text-zinc-500 hover:text-red-400 p-2 rounded hover:bg-zinc-800 transition-colors"
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

              {/* Selectors Section */}
              <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Selectors</h3>
                  <div className="flex gap-3 items-center">
                      <div className="flex-[2] relative">
                          <input
                              type="text"
                              value={newSelector.name}
                              onChange={(e) => setNewSelector({...newSelector, name: e.target.value})}
                              placeholder="e.g. Auto"
                              className="w-full bg-[#0c0c0e] border border-zinc-800/80 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                          />
                      </div>
                      <div className="flex-[2] relative">
                          <input
                              type="text"
                              value={newSelector.regex}
                              onChange={(e) => setNewSelector({...newSelector, regex: e.target.value})}
                              placeholder=".*"
                              className="w-full bg-[#0c0c0e] border border-zinc-800/80 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all font-mono"
                          />
                      </div>
                      <div className="flex-[2] relative">
                          <input
                              type="text"
                              value={newSelector.default}
                              onChange={(e) => setNewSelector({...newSelector, default: e.target.value})}
                              placeholder="Node-1"
                              className="w-full bg-[#0c0c0e] border border-zinc-800/80 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                          />
                      </div>
                      <div className="flex-1 flex items-center justify-center bg-[#0c0c0e] border border-zinc-800/80 rounded-lg px-4 py-2.5">
                          <label className="flex items-center gap-2 cursor-pointer mb-0">
                              <span className="text-xs font-medium text-zinc-500 select-none">Interrupt</span>
                              <input
                                  type="checkbox"
                                  checked={newSelector.interrupt_exist_connections}
                                  onChange={(e) => setNewSelector({...newSelector, interrupt_exist_connections: e.target.checked})}
                                  className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0"
                              />
                          </label>
                      </div>
                      <button
                          onClick={handleAddSelector}
                          className="px-6 py-2.5 text-sm font-medium bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 active:scale-95 transition-all shadow-sm"
                      >
                          Add Selector
                      </button>
                  </div>

                  {selectors.length === 0 ? (
                      <div className="text-sm text-zinc-600 text-center py-6 bg-zinc-950/30 rounded-lg border border-zinc-800/30">
                          No selectors configured.
                      </div>
                  ) : (
                      <div className="w-full overflow-hidden">
                          <table className="w-full text-sm text-left">
                              <thead className="text-[10px] uppercase font-bold text-zinc-500 border-b border-zinc-800/50">
                                  <tr>
                                      <th className="px-4 py-3">Name</th>
                                      <th className="px-4 py-3">Regex</th>
                                      <th className="px-4 py-3">Default</th>
                                      <th className="px-4 py-3">Int</th>
                                      <th className="px-4 py-3 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/30">
                                  {selectors.map((sel, idx) => (
                                      <tr key={idx} className="hover:bg-zinc-800/10 transition-colors group">
                                          <td className="px-4 py-4 font-medium text-zinc-200">{sel.name}</td>
                                          <td className="px-4 py-4 text-zinc-400 font-mono text-xs">{sel.regex}</td>
                                          <td className="px-4 py-4 text-zinc-400">{sel.default || '-'}</td>
                                          <td className="px-4 py-4">
                                              {sel.interrupt_exist_connections ? (
                                                  <span className="text-emerald-500 font-medium text-xs">Yes</span>
                                              ) : (
                                                  <span className="text-zinc-600 text-xs">No</span>
                                              )}
                                          </td>
                                          <td className="px-4 py-4 text-right">
                                              <button
                                                  onClick={() => handleRemoveSelector(idx)}
                                                  className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                      <h3 className="text-base font-semibold text-white">Upload Configuration</h3>
                      <button onClick={() => setIsUploadOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                          <X className="h-5 w-5" />
                      </button>
                  </div>
                  <div className="p-6">
                      <label htmlFor="filename" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                          Save file as
                      </label>
                      <input
                          type="text"
                          id="filename"
                          value={uploadFileName}
                          onChange={(e) => setUploadFileName(e.target.value)}
                          className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                          autoFocus
                      />
                  </div>
                  <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50">
                      <button
                          onClick={() => setIsUploadOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={handleUploadSubmit}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                          {isSaving ? 'Uploading...' : 'Upload File'}
                      </button>
                  </div>
              </div>
          </div>
      )}


      {/* Delete Confirmation Modal */}
      {configToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-6 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                          <Trash2 className="h-6 w-6 text-red-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                          Delete Configuration?
                      </h3>
                      <p className="text-sm text-zinc-400">
                          Are you sure you want to delete <strong className="text-zinc-200 font-mono">{configToDelete}</strong>? This action cannot be undone.
                      </p>
                  </div>
                  <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50">
                      <button
                          onClick={() => setConfigToDelete(null)}
                          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                          disabled={isSaving}
                      >
                          Cancel
                      </button>
                      <button
                          onClick={handleDeleteConfig}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                      >
                          {isSaving ? 'Deleting...' : 'Delete Config'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Create Name Modal */}
      {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#0c0c0e] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                      <h3 className="text-base font-semibold text-white">Create Configuration</h3>
                      <button onClick={() => setIsCreateOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                          <X className="h-5 w-5" />
                      </button>
                  </div>
                  <div className="p-6">
                      <label htmlFor="createFileName" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                          New filename
                      </label>
                      <input
                          type="text"
                          id="createFileName"
                          value={createFileName}
                          onChange={(e) => setCreateFileName(e.target.value)}
                          className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                          placeholder="e.g., custom-config.json"
                          autoFocus
                      />
                  </div>
                  <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900/50">
                      <button
                          onClick={() => setIsCreateOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={handleCreateSubmit}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                          {isSaving ? 'Creating...' : 'Create File'}
                      </button>
                  </div>
              </div>
          </div>
      )}


      {/* Merged Config Editor Modal */}
      {isMergedEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
              <div className="flex flex-col w-full max-w-5xl h-full max-h-[90vh] bg-[#0c0c0e] border border-zinc-800 shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                          <FileJson className="h-5 w-5 text-zinc-400" />
                          <h3 className="text-base font-medium text-white">Merged Configuration (Read-only)</h3>
                      </div>
                      <button
                          onClick={() => setIsMergedEditorOpen(false)}
                          className="p-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Close"
                      >
                          <X className="h-5 w-5" />
                      </button>
                  </div>

                  <div className="flex-1 relative bg-[#1e1e1e]">
                      <Editor
                          height="100%"
                          defaultLanguage="json"
                          theme="vs-dark"
                          value={mergedConfigContent}
                          options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              wordWrap: 'on',
                              scrollBeyondLastLine: false,
                              padding: { top: 24, bottom: 24 },
                              readOnly: true,
                          }}
                      />
                  </div>
              </div>
          </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
              <div className="flex flex-col w-full max-w-5xl h-full max-h-[90vh] bg-[#0c0c0e] border border-zinc-800 shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                          <Edit className="h-5 w-5 text-zinc-400" />
                          <div className="flex items-baseline gap-3">
                            <h3 className="text-base font-medium text-white">{editingFileName}</h3>
                            {hasEditorChanges && <span className="text-xs font-medium text-amber-500 normal-case">(Unsaved changes)</span>}
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                          <button
                              onClick={handleSaveEditor}
                              disabled={!hasEditorChanges || isSaving}
                              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm ${
                                  hasEditorChanges
                                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                              }`}
                          >
                              {isSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                          <div className="w-px h-6 bg-zinc-800"></div>
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
                              className="p-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                              title="Close Editor"
                          >
                              <X className="h-5 w-5" />
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 relative bg-[#1e1e1e]">
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
                              padding: { top: 24, bottom: 24 },
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
