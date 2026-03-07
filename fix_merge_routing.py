import re

with open('src/merge.rs', 'r') as f:
    content = f.read()

bad_block = """                        if let Some(routing_mark) = &sub.routing_mark {
                            match routing_mark.parse::<i32>() {
                                Ok(mark) => {
                                    outbound["routing_mark"] = serde_json::Value::Number(serde_json::Number::from(mark));
                                }
                                Err(e) => {
                                    error!("Failed to parse routing_mark '{}' as integer for tag '{}': {}", routing_mark, tag, e);
                                }
                            }
                        }"""

good_block = """                        if let Some(routing_mark) = &sub.routing_mark {
                            outbound["routing_mark"] = serde_json::Value::String(routing_mark.clone());
                        }"""

content = content.replace(bad_block, good_block)

with open('src/merge.rs', 'w') as f:
    f.write(content)
