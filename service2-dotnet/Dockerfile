FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Service2.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out ./

EXPOSE 8081

ENV ASPNETCORE_URLS=http://0.0.0.0:8081

# Käynnistys
ENTRYPOINT ["dotnet", "Service2.dll"]
