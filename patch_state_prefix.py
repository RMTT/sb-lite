with open("src/state.rs", "r") as f:
    code = f.read()

old_struct = """#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Subscription {
    pub url: String,
    pub last_fetched: Option<chrono::DateTime<chrono::Utc>>,
    pub raw_data: Option<String>,
}"""

new_struct = """#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Subscription {
    pub url: String,
    #[serde(default)]
    pub prefix: Option<String>,
    pub last_fetched: Option<chrono::DateTime<chrono::Utc>>,
    pub raw_data: Option<String>,
}"""

code = code.replace(old_struct, new_struct)

with open("src/state.rs", "w") as f:
    f.write(code)
