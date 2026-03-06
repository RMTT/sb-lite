import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { UploadCloud, Save, RefreshCw, FileJson, Play, Edit, X, Plus, Trash2, Share } from 'lucide-react'
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
              last_fetched: validationData.last_fetched,
              raw_data: validationData.raw_data
          }
          const updatedSubs = [...subscriptions, newSub]
          setSubscriptions(updatedSubs)
          setNewUrl('')

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
                                  <button
                                      onClick={() => setConfigToDelete(filename)}
                                      disabled={isLoading}
                                      className="btn btn-sm btn-square btn-ghost text-base-content/50 hover:text-red-400 hover:bg-base-300 transition-colors"
                                      title="Delete Configuration"
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
      <div className="card bg-base-200 shadow-sm border border-base-300">
          <div className="card-body p-5 border-b border-base-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                  <h2 className="text-lg font-medium text-base-content">Custom Settings</h2>
                  <p className="text-sm text-base-content/60 mt-1">Configure remote subscriptions and proxy selectors.</p>
              </div>
              <div className="flex items-center gap-2">
                  <button
                      onClick={handleOpenMergedConfig}
                      disabled={isLoading}
                      className="btn btn-sm btn-outline"
                  >
                      <Share className="h-4 w-4" />
                      Show merged config
                  </button>

              </div>
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
                          disabled={!newUrl.trim() || isAddingUrl}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-base-300 text-base-content rounded-md hover:bg-base-300/80 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                      >
                          {isAddingUrl ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                              <Plus className="h-4 w-4" />
                          )}
                          Add URL
                      </button>
                  </div>

                  {subscriptions.length === 0 ? (
                      <div className="text-sm text-base-content/50 text-center py-4 bg-base-100/50 rounded-md border border-base-300">
                          No subscription URLs added yet.
                      </div>
                  ) : (
                      <ul className="space-y-2">
                          {subscriptions.map((sub, idx) => (
                              <li key={idx} className="flex flex-col bg-base-100 border border-zinc-800 rounded-md px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between">
                                      <span className="text-base-content/80 truncate mr-4">{sub.url}</span>
                                      <div className="flex items-center gap-2">
                                          <button
                                              onClick={() => handleUpdateSubscription(idx)}
                                              type="button"
                                              disabled={updatingIndex === idx}
                                              className="text-base-content/50 hover:text-primary transition-colors shrink-0 p-1.5 rounded-md hover:bg-base-300 disabled:opacity-50"
                                              title="Update Subscription"
                                          >
                                              <RefreshCw className={`h-4 w-4 ${updatingIndex === idx ? 'animate-spin' : ''}`} />
                                          </button>
                                          <button
                                              onClick={() => handleRemoveUrl(idx)}
                                              className="text-base-content/50 hover:text-red-400 transition-colors shrink-0 p-1.5 rounded-md hover:bg-base-300"
                                              title="Remove URL"
                                          >
                                              <Trash2 className="h-4 w-4" />
                                          </button>
                                      </div>
                                  </div>
                                  <div className="text-xs text-base-content/50 mt-1">
                                      Last fetched: {sub.last_fetched ? new Date(sub.last_fetched).toLocaleString() : 'Never'}
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
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-base-300 text-base-content rounded-md hover:bg-base-300/80 active:scale-95 transition-all shadow-sm"
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


      {/* Delete Confirmation Modal */}
      {configToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-base-100 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b border-base-300">
                      <h3 className="text-lg font-medium text-red-500 flex items-center gap-2">
                          <Trash2 className="h-5 w-5" />
                          Delete Configuration
                      </h3>
                  </div>
                  <div className="p-4 space-y-4">
                      <p className="text-sm text-base-content/80">
                          Are you sure you want to delete <strong className="text-base-content font-mono">{configToDelete}</strong>? This action cannot be undone.
                      </p>
                  </div>
                  <div className="p-4 bg-base-200 border-t border-base-300 flex justify-end gap-2">
                      <button
                          onClick={() => setConfigToDelete(null)}
                          className="px-4 py-2 text-sm font-medium text-base-content/60 hover:text-base-content transition-colors"
                          disabled={isSaving}
                      >
                          Cancel
                      </button>
                      <button
                          onClick={handleDeleteConfig}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-colors shadow-sm disabled:opacity-50"
                      >
                          {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                          Delete
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


      {/* Merged Config Editor Modal */}
      {isMergedEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <div className="flex flex-col w-full max-w-5xl h-full max-h-[90vh] bg-[#1e1e1e] border border-base-300 shadow-2xl rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-base-300 bg-[#252526]">
                      <div className="text-sm font-medium text-base-content/80 flex items-center gap-2">
                          <FileJson className="h-4 w-4 text-primary" />
                          <span className="text-base-content">Merged Configuration (Read-only)</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <button
                              onClick={() => setIsMergedEditorOpen(false)}
                              className="btn btn-sm btn-square btn-ghost"
                              title="Close"
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
                          value={mergedConfigContent}
                          options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              wordWrap: 'on',
                              scrollBeyondLastLine: false,
                              padding: { top: 16, bottom: 16 },
                              readOnly: true,
                          }}
                      />
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
