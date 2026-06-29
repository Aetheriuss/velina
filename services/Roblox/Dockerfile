# syntax=docker/dockerfile:1
# Velina backend (.NET 10 LTS, ASP.NET Core) — DEP-1 / Phase 6.
# Build context is services/Roblox (the solution directory).

# ---- build ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
# Copy only the solution + every project's .csproj first, preserving paths, then restore.
# This layer is cached across code-only changes, so `dotnet restore` (the slow NuGet step) is
# skipped unless a .csproj actually changes. NOTE: adding a new project to Roblox.sln means
# adding its .csproj here too, or the restore below fails fast with a missing-project error.
COPY Roblox.sln .
COPY Roblox.AbuseDetection/Roblox.AbuseDetection.csproj Roblox.AbuseDetection/
COPY Roblox.Cache/Roblox.Cache.csproj Roblox.Cache/
COPY Roblox.Configuration/Roblox.Configuration.csproj Roblox.Configuration/
COPY Roblox.Dto/Roblox.Dto.csproj Roblox.Dto/
COPY Roblox.EconomyChat/Roblox.EconomyChat.csproj Roblox.EconomyChat/
COPY Roblox.Exceptions/Roblox.Exceptions.csproj Roblox.Exceptions/
COPY Roblox.IntegrationTest/Roblox.IntegrationTest.csproj Roblox.IntegrationTest/
COPY Roblox.Libraries.UnitTest/Roblox.Libraries.UnitTest.csproj Roblox.Libraries.UnitTest/
COPY Roblox.Libraries/Roblox.Libraries.csproj Roblox.Libraries/
COPY Roblox.Logging/Roblox.Logging.csproj Roblox.Logging/
COPY Roblox.Metrics/Roblox.Metrics.csproj Roblox.Metrics/
COPY Roblox.Models/Roblox.Models.csproj Roblox.Models/
COPY Roblox.Rendering.Test/Roblox.Rendering.Test.csproj Roblox.Rendering.Test/
COPY Roblox.Rendering/Roblox.Rendering.csproj Roblox.Rendering/
COPY Roblox.Services/Roblox.Services.csproj Roblox.Services/
COPY Roblox.UnitTest/Roblox.UnitTest.csproj Roblox.UnitTest/
COPY Roblox.Website/Roblox.Website.csproj Roblox.Website/
RUN dotnet restore Roblox.sln
# Now bring in the rest of the source. A code-only change invalidates from here down only,
# leaving the restore layer above intact.
COPY . .
# Release => DEBUG is NOT defined, so the auth that is compiled out under #if DEBUG stays
# in (security finding H7 / P0-3). RELEASE is added explicitly so the prod-only caching
# (#if RELEASE) the app expects is active; TRACE is preserved.
RUN dotnet publish Roblox.Website/Roblox.Website.csproj \
      -c Release \
      -p:DefineConstants="RELEASE%3BTRACE" \
      -o /app --no-restore

# ---- runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
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
