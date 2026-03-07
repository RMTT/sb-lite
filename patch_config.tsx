--- web/src/pages/Config.tsx	2024-05-24 10:00:00.000000000 -0400
+++ web/src/pages/Config.tsx	2024-05-24 10:00:00.000000000 -0400
@@ -717,6 +717,11 @@
                                       {sub.prefix}
                                   </span>
                               )}
+                              {sub.routing_mark && (
+                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-widest uppercase border border-indigo-500/20">
+                                      {sub.routing_mark}
+                                  </span>
+                              )}
                             </div>
                             <div className="text-[10px] text-zinc-500">
                               Last fetched: {sub.last_fetched ? 'Just now' : 'Never'} <span className="mx-1">•</span> Status: <span className="text-emerald-500">Success</span>
