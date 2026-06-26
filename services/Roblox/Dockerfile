# syntax=docker/dockerfile:1
# Velina backend (.NET 6, ASP.NET Core) — DEP-1.
# NOTE: still net6.0 for go-live; the .NET 10 LTS migration is Phase 6 of the plan.
# Build context is services/Roblox (the solution directory).

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore Roblox.sln
# Release => DEBUG is NOT defined, so the auth that is compiled out under #if DEBUG stays
# in (security finding H7 / P0-3). RELEASE is added explicitly so the prod-only caching
# (#if RELEASE) the app expects is active; TRACE is preserved.
RUN dotnet publish Roblox.Website/Roblox.Website.csproj \
      -c Release \
      -p:DefineConstants="RELEASE%3BTRACE" \
      -o /app --no-restore

# ---- runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS runtime
# Native deps: libsodium (Sodium.Core) + ffmpeg (FFMpegCore); curl for the healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libsodium23 ffmpeg curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:5000
EXPOSE 5000
# appsettings.json + game-servers.json are gitignored and bind-mounted at runtime (plan §1).
# The app crashes at boot without appsettings.json (no env fallback) — that is expected.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=5 \
  CMD curl -fsS http://localhost:5000/healthz || exit 1
ENTRYPOINT ["dotnet", "Roblox.Website.dll"]
