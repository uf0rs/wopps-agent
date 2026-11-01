FROM alpine AS base

ARG BUN_RUNTIME_TRANSPILER_CACHE_PATH=0
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=${BUN_RUNTIME_TRANSPILER_CACHE_PATH}
RUN apk add --no-cache libgcc libstdc++ ripgrep

FROM base AS build-amd64
COPY dist/cli-linux-x64-baseline-musl/bin/uf0rs /usr/local/bin/uf0rs

FROM base AS build-arm64
COPY dist/cli-linux-arm64-musl/bin/uf0rs /usr/local/bin/uf0rs

ARG TARGETARCH
FROM build-${TARGETARCH}
RUN ln -s uf0rs /usr/local/bin/uf0rs2 && uf0rs --version && uf0rs2 --version
ENTRYPOINT ["uf0rs"]
