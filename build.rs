use sha2::Digest;
use std::env;
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;

const CORE_VERSION: &str = "1.12.24";

fn get_target_os_arch() -> (&'static str, &'static str, &'static str) {
    let target = env::var("TARGET").expect("TARGET environment variable not set");

    let os = if target.contains("linux") {
        "linux"
    } else if target.contains("windows") {
        "windows"
    } else if target.contains("apple") {
        "darwin"
    } else {
        panic!("Unsupported OS in target: {}", target);
    };

    let arch = if target.contains("x86_64") {
        "amd64"
    } else if target.contains("aarch64") {
        "arm64"
    } else if target.contains("x86") || target.contains("i686") {
        "386"
    } else {
        panic!("Unsupported arch in target: {}", target);
    };

    let ext = if os == "windows" { ".zip" } else { ".tar.gz" };

    (os, arch, ext)
}

fn download_and_extract_sing_box() {
    let version = CORE_VERSION;
    let (os, arch, ext) = get_target_os_arch();
    let filename = format!("sing-box-{}-{}-{}{}", version, os, arch, ext);
    let url = format!(
        "https://github.com/SagerNet/sing-box/releases/download/v{}/{}",
        version, filename
    );

    let out_dir = env::var("OUT_DIR").expect("OUT_DIR environment variable not set");
    let out_path = PathBuf::from(out_dir);
    let archive_path = out_path.join(&filename);
    let bin_name = if os == "windows" {
        "sing-box.exe"
    } else {
        "sing-box"
    };
    let dest_bin_path = out_path.join("sing-box-bin");
    let dest_zst_path = out_path.join("sing-box-bin.zst");

    // Don't redownload if we already extracted it successfully
    if dest_zst_path.exists() {
        return;
    }

    if !dest_bin_path.exists() {
        println!("cargo:warning=Downloading sing-box from {}", url);

        let client = reqwest::blocking::Client::builder()
            .user_agent("sblite-build")
            .build()
            .expect("Failed to build reqwest client");

        let mut response = client
            .get(&url)
            .send()
            .unwrap_or_else(|e| panic!("Failed to download sing-box from {}: {}", url, e));

        if !response.status().is_success() {
            panic!("Failed to download sing-box: HTTP {}", response.status());
        }

        let mut file = fs::File::create(&archive_path)
            .unwrap_or_else(|e| panic!("Failed to create archive file {:?}: {}", archive_path, e));
        std::io::copy(&mut response, &mut file)
            .unwrap_or_else(|e| panic!("Failed to write archive to {:?}: {}", archive_path, e));

        println!("cargo:warning=Extracting sing-box");

        if os == "windows" {
            let file = fs::File::open(&archive_path).expect("Failed to open zip file");
            let mut archive = zip::ZipArchive::new(file).expect("Failed to read zip archive");

            let mut found = false;
            for i in 0..archive.len() {
                let mut file = archive.by_index(i).unwrap();
                let entry_name = file.name().to_string();
                if entry_name.ends_with(bin_name) {
                    let mut dest =
                        fs::File::create(&dest_bin_path).expect("Failed to create bin file");
                    std::io::copy(&mut file, &mut dest).expect("Failed to extract bin file");
                    found = true;
                    break;
                }
            }
            if !found {
                panic!("Could not find {} in zip archive", bin_name);
            }
        } else {
            let file = fs::File::open(&archive_path).expect("Failed to open tar.gz file");
            let tar = flate2::read::GzDecoder::new(file);
            let mut archive = tar::Archive::new(tar);

            let mut found = false;
            for entry in archive.entries().expect("Failed to read tar entries") {
                let mut entry = entry.expect("Failed to get tar entry");
                let path = entry.path().expect("Failed to get entry path");
                let path_str = path.to_string_lossy();
                if path_str.ends_with(bin_name) {
                    entry
                        .unpack(&dest_bin_path)
                        .expect("Failed to unpack bin file");
                    found = true;
                    break;
                }
            }
            if !found {
                panic!("Could not find {} in tar.gz archive", bin_name);
            }
        }
    }

    println!("cargo:warning=Compressing sing-box binary");
    let mut file = fs::File::open(&dest_bin_path).expect("Failed to open extracted binary");
    let mut data = Vec::new();
    file.read_to_end(&mut data)
        .expect("Failed to read extracted binary");

    let compressed = zstd::encode_all(&*data, 22).expect("Failed to compress binary");
    let mut zst_file = fs::File::create(&dest_zst_path).expect("Failed to create zst file");
    zst_file
        .write_all(&compressed)
        .expect("Failed to write compressed binary");

    // Compute hash of decompressed binary for runtime comparison
    let mut hasher = sha2::Sha256::new();
    sha2::Digest::update(&mut hasher, &data);
    let hash = format!("{:x}", hasher.finalize());
    let dest_hash_path = out_path.join("sing-box-bin.sha256");
    fs::write(&dest_hash_path, hash).expect("Failed to write hash file");
}

fn main() {
    println!("cargo:rerun-if-changed=web/package.json");
    println!("cargo:rerun-if-changed=web/src");
    println!("cargo:rerun-if-changed=web/vite.config.ts");
    println!("cargo:rerun-if-changed=web/index.html");
    println!("cargo:rerun-if-changed=web/tsconfig.json");
    println!("cargo:rerun-if-changed=build.rs");

    download_and_extract_sing_box();
}
