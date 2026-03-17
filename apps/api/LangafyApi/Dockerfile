# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Speed up restore: skip first-run experience and XML doc downloads
ENV DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
ENV NUGET_XMLDOC_MODE=skip

# Copy project file first (layer-cache: only re-runs restore if .csproj changes)
COPY ["apps/api/LangafyApi/LangafyApi.csproj", "apps/api/LangafyApi/"]

# Workaround: SDK 10.0.201 has a bug in Microsoft.NET.Publish.targets where
# GetTargetFrameworkVersion('net6.0') throws at project load time (before any
# target runs, so --runtime flags can't help). Hardcode the known correct values.
# Remove this block when upgrading to a fixed .NET 10 SDK version.
RUN SDK_VER=$(dotnet --version) && \
    TARGETS="/usr/share/dotnet/sdk/${SDK_VER}/Sdks/Microsoft.NET.Sdk/targets/Microsoft.NET.Publish.targets" && \
    sed -i \
      's|<_FirstTargetFrameworkVersionToSupportTrimAnalyzer>.*</_FirstTargetFrameworkVersionToSupportTrimAnalyzer>|<_FirstTargetFrameworkVersionToSupportTrimAnalyzer>6.0</_FirstTargetFrameworkVersionToSupportTrimAnalyzer>|' \
      "${TARGETS}" && \
    sed -i \
      's|<_FirstTargetFrameworkVersionToSupportAotAnalyzer>.*</_FirstTargetFrameworkVersionToSupportAotAnalyzer>|<_FirstTargetFrameworkVersionToSupportAotAnalyzer>7.0</_FirstTargetFrameworkVersionToSupportAotAnalyzer>|' \
      "${TARGETS}" && \
    sed -i \
      's|<_FirstTargetFrameworkVersionToSupportSingleFileAnalyzer>.*</_FirstTargetFrameworkVersionToSupportSingleFileAnalyzer>|<_FirstTargetFrameworkVersionToSupportSingleFileAnalyzer>6.0</_FirstTargetFrameworkVersionToSupportSingleFileAnalyzer>|' \
      "${TARGETS}"

RUN dotnet restore "apps/api/LangafyApi/LangafyApi.csproj" --runtime linux-x64

# Copy source code
COPY . .

# Publish (includes build) — no-self-contained uses the aspnet runtime base image
FROM build AS publish
RUN dotnet publish "apps/api/LangafyApi/LangafyApi.csproj" \
    -c Release \
    -r linux-x64 \
    --no-self-contained \
    --no-restore \
    -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Expose port 5000
EXPOSE 5000

# Health check — curl is not in the aspnet image; wget is
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

# Run the application
ENTRYPOINT ["dotnet", "LangafyApi.dll"]
