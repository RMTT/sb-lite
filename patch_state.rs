--- src/state.rs	2024-05-24 10:00:00.000000000 -0400
+++ src/state.rs	2024-05-24 10:00:00.000000000 -0400
@@ -165,11 +165,31 @@
             .arg("-c")
             .arg(&tmp_path)
             .arg("-D")
             .arg(&self.state_directory)
-            .stdout(std::process::Stdio::null())
-            .stderr(std::process::Stdio::null())
+            .stdout(std::process::Stdio::piped())
+            .stderr(std::process::Stdio::piped())
             .spawn()
         {
-            Ok(child) => {
+            Ok(mut child) => {
+                if let Some(stdout) = child.stdout.take() {
+                    tokio::spawn(async move {
+                        use tokio::io::{AsyncBufReadExt, BufReader};
+                        let mut reader = BufReader::new(stdout).lines();
+                        while let Ok(Some(line)) = reader.next_line().await {
+                            log::info!("{}", line);
+                        }
+                    });
+                }
+
+                if let Some(stderr) = child.stderr.take() {
+                    tokio::spawn(async move {
+                        use tokio::io::{AsyncBufReadExt, BufReader};
+                        let mut reader = BufReader::new(stderr).lines();
+                        while let Ok(Some(line)) = reader.next_line().await {
+                            log::error!("{}", line);
+                        }
+                    });
+                }
+
                 *process_lock = Some(child);
                 let mut start_time_lock = self.start_time.lock().await;
