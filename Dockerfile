FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend

WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM --platform=$BUILDPLATFORM rust:1.88-alpine AS backend

RUN apk add --no-cache musl-dev pkgconf openssl-dev openssl-libs-static

WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY build.rs ./
COPY src/ src/
COPY .cargo .cargo
COPY --from=frontend /build/web/dist/ web/dist/

ARG TARGETPLATFORM

RUN apk add --no-cache lld clang
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
      rustup target add aarch64-unknown-linux-musl; \
    fi
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/build/target,sharing=locked \
    if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
      export CC_aarch64_unknown_linux_musl=clang; \
      cargo build --release --target aarch64-unknown-linux-musl; \
      cp /build/target/aarch64-unknown-linux-musl/release/sblite /build/sblite; \
    else \
      cargo build --release && \
      cp /build/target/release/sblite /build/sblite; \
    fi

FROM alpine:3.23

RUN apk add --no-cache ca-certificates
COPY --from=backend /build/sblite /usr/local/bin/sblite

EXPOSE 8180
VOLUME ["/var/lib/sblite"]

ENTRYPOINT ["sblite"]
CMD ["--listen", "0.0.0.0:8180"]
