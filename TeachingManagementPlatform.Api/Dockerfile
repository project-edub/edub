FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY TeachingManagementPlatform.Api.csproj ./
RUN dotnet restore ./TeachingManagementPlatform.Api.csproj

COPY . ./
RUN dotnet publish ./TeachingManagementPlatform.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish ./

ENTRYPOINT ["dotnet", "TeachingManagementPlatform.Api.dll"]