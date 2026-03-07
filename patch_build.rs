--- build.rs	2024-05-24 10:00:00.000000000 -0400
+++ build.rs	2024-05-24 10:00:00.000000000 -0400
@@ -4,7 +4,7 @@
 use std::io::{Read, Write};
 use std::path::PathBuf;

-const CORE_VERSION: &'static str = "1.12.24";
+const CORE_VERSION: &str = "1.12.24";

 fn get_target_os_arch() -> (&'static str, &'static str, &'static str) {
     let target = env::var("TARGET").expect("TARGET environment variable not set");
