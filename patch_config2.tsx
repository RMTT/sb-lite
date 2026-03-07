--- web/src/pages/Config.tsx
+++ web/src/pages/Config.tsx
@@ -718,13 +718,14 @@
                                       {sub.prefix}
                                   </span>
                               )}
-                              {sub.routing_mark && (
-                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-widest uppercase border border-indigo-500/20">
-                                      {sub.routing_mark}
-                                  </span>
-                              )}
                             </div>
-                            <div className="text-[10px] text-zinc-500">
-                              Last fetched: {sub.last_fetched ? 'Just now' : 'Never'} <span className="mx-1">•</span> Status: <span className="text-emerald-500">Success</span>
+                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
+                              <span>Last fetched: {sub.last_fetched ? 'Just now' : 'Never'}</span> <span className="mx-0.5">•</span> <span>Status: <span className="text-emerald-500">Success</span></span>
+                              {sub.routing_mark && (
+                                  <><span className="mx-0.5">•</span> <span className="flex items-center gap-1">Routing Mark: <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold tracking-widest uppercase border border-indigo-500/20">{sub.routing_mark}</span></span></>
+                              )}
                             </div>
                           </div>
                         </div>
