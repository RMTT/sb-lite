with open("src/merge.rs", "r") as f:
    code = f.read()

old_logic = """                    for server in servers {
                        let tag = server
                            .remarks
                            .clone()
                            .unwrap_or_else(|| server.server.clone());
                        let mut outbound = json!({"""

new_logic = """                    for server in servers {
                        let mut tag = server
                            .remarks
                            .clone()
                            .unwrap_or_else(|| server.server.clone());

                        if let Some(prefix) = &sub.prefix {
                            if !prefix.is_empty() {
                                tag = format!("{} {}", prefix, tag);
                            }
                        }

                        let mut outbound = json!({"""

code = code.replace(old_logic, new_logic)

with open("src/merge.rs", "w") as f:
    f.write(code)
