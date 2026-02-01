# Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY *.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish

# Run
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render sets PORT; ASP.NET listens on 0.0.0.0:PORT via ASPNETCORE_URLS
EXPOSE 8080
ENTRYPOINT ["dotnet", "SmartTaskTracker.API.dll"]
