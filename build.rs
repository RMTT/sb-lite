use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=web/package.json");
    println!("cargo:rerun-if-changed=web/src");
    println!("cargo:rerun-if-changed=web/vite.config.ts");
    println!("cargo:rerun-if-changed=web/index.html");
    println!("cargo:rerun-if-changed=web/tsconfig.json");

    let npm_install = Command::new("npm")
        .current_dir("web")
        .arg("install")
        .status()
        .expect("Failed to execute npm install");

    if !npm_install.success() {
        panic!("npm install failed");
    }

    let npm_build = Command::new("npm")
        .current_dir("web")
        .arg("run")
        .arg("build")
        .status()
        .expect("Failed to execute npm run build");

    if !npm_build.success() {
        panic!("npm run build failed");
    }
}
