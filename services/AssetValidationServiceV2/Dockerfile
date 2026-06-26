# syntax=docker/dockerfile:1
# Velina asset validator (Go / Fiber) — DEP-1.
# Requires ASSET_VALIDATION_AUTHORIZATION at runtime (fails closed without it; P0-2).

# ---- build ----
FROM golang:1.23-bookworm AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Static binary so it can run on a distroless base.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/validator .

# ---- runtime ----
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/validator /validator
EXPOSE 4300
USER nonroot:nonroot
ENTRYPOINT ["/validator"]
