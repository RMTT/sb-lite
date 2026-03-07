--- src/main.rs	2024-05-24 10:00:00.000000000 -0400
+++ src/main.rs	2024-05-24 10:00:00.000000000 -0400
@@ -141,12 +141,32 @@
                             .arg("-c")
                             .arg(&tmp_path)
                             .arg("-D")
                             .arg(&shared_state.state_directory)
-                            .stdout(std::process::Stdio::null())
-                            .stderr(std::process::Stdio::null())
+                            .stdout(std::process::Stdio::piped())
+                            .stderr(std::process::Stdio::piped())
                             .spawn()
                         {
-                            Ok(child) => {
+                            Ok(mut child) => {
+                                if let Some(stdout) = child.stdout.take() {
+                                    tokio::spawn(async move {
+                                        use tokio::io::{AsyncBufReadExt, BufReader};
+                                        let mut reader = BufReader::new(stdout).lines();
+                                        while let Ok(Some(line)) = reader.next_line().await {
+                                            info!("{}", line);
+                                        }
+                                    });
+                                }
+
+                                if let Some(stderr) = child.stderr.take() {
+                                    tokio::spawn(async move {
+                                        use tokio::io::{AsyncBufReadExt, BufReader};
+                                        let mut reader = BufReader::new(stderr).lines();
+                                        while let Ok(Some(line)) = reader.next_line().await {
+                                            error!("{}", line);
+                                        }
+                                    });
+                                }
+
                                 let mut process_lock = shared_state.sing_box_process.lock().await;
                                 *process_lock = Some(child);
                                 let mut start_time_lock = shared_state.start_time.lock().await;
