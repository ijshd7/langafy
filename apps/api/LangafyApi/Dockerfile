# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files
COPY ["apps/api/LangafyApi/LangafyApi.csproj", "apps/api/LangafyApi/"]

# Restore dependencies
RUN dotnet restore "apps/api/LangafyApi/LangafyApi.csproj"

# Copy source code
COPY . .

# Build the application
RUN dotnet build "apps/api/LangafyApi/LangafyApi.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "apps/api/LangafyApi/LangafyApi.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Expose port 5000
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD dotnet-health-check || exit 1

# Run the application
ENTRYPOINT ["dotnet", "LangafyApi.dll"]
