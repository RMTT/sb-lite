use rust_embed::Embed;

#[derive(Embed)]
#[folder = "web/dist/"]
struct Asset;

fn main() {
    println!("Hello World!");
    println!("Embedded files:");
    for file in Asset::iter() {
        println!(" - {}", file.as_ref());
    }
}
