{
  description = "Generic rust Dev Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
          };
        };
      in
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            llvmPackages.clang-unwrapped
            rustup
            openssl
            pkg-config
            rust-analyzer
            rustfmt
            nodejs
            typescript
          ];
          CC_aarch64_unknown_linux_musl = "clang";
        };
      }
    );
}
