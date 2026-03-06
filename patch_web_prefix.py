import re

with open("web/src/pages/Config.tsx", "r") as f:
    code = f.read()

# 1. Add prefix to interface
code = code.replace("""export interface Subscription {
    url: string
    last_fetched: string | null
    raw_data: string | null
}""", """export interface Subscription {
    url: string
    prefix?: string
    last_fetched: string | null
    raw_data: string | null
}""")

# 2. Add prefix state
code = code.replace("const [newUrl, setNewUrl] = useState('')", "const [newUrl, setNewUrl] = useState('')\n  const [newPrefix, setNewPrefix] = useState('')")

# 3. Update handleAddUrl
old_add = """          const newSub: Subscription = {
              url: urlToAdd,
              last_fetched: validationData.last_fetched,
              raw_data: validationData.raw_data
          }
          const updatedSubs = [...subscriptions, newSub]
          setSubscriptions(updatedSubs)
          setNewUrl('')"""
new_add = """          const newSub: Subscription = {
              url: urlToAdd,
              prefix: newPrefix.trim() || undefined,
              last_fetched: validationData.last_fetched,
              raw_data: validationData.raw_data
          }
          const updatedSubs = [...subscriptions, newSub]
          setSubscriptions(updatedSubs)
          setNewUrl('')
          setNewPrefix('')"""
code = code.replace(old_add, new_add)

# 4. Update the add URL UI
old_ui = """                  <div className="flex gap-2">
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
                  </div>"""

new_ui = """                  <div className="flex gap-2 items-start">
                      <div className="flex-1 flex gap-2">
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
                          <input
                              type="text"
                              value={newPrefix}
                              onChange={(e) => setNewPrefix(e.target.value)}
                              placeholder="Prefix (Optional)"
                              className="w-40 bg-base-100 border border-base-300 rounded-md px-3 py-2 text-sm text-base-content focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddUrl()
                              }}
                          />
                      </div>
                      <button
                          onClick={handleAddUrl}
                          disabled={!newUrl.trim() || isAddingUrl}
                          className="flex items-center justify-center gap-2 px-4 py-2 h-[38px] text-sm font-medium bg-base-300 text-base-content rounded-md hover:bg-base-300/80 active:scale-95 transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
                      >
                          {isAddingUrl ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                              <Plus className="h-4 w-4" />
                          )}
                          Add URL
                      </button>
                  </div>"""

code = code.replace(old_ui, new_ui)

# 5. Display prefix if present
old_sub_display = """                                  <div className="flex items-center justify-between">
                                      <span className="text-base-content/80 truncate mr-4">{sub.url}</span>
                                      <div className="flex items-center gap-2">"""
new_sub_display = """                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 truncate mr-4">
                                          <span className="text-base-content/80 truncate">{sub.url}</span>
                                          {sub.prefix && (
                                              <span className="badge badge-sm badge-outline text-xs opacity-70 whitespace-nowrap shrink-0">
                                                  Prefix: {sub.prefix}
                                              </span>
                                          )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">"""
code = code.replace(old_sub_display, new_sub_display)

with open("web/src/pages/Config.tsx", "w") as f:
    f.write(code)
