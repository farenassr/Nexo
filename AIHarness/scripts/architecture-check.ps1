[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$violations = [System.Collections.Generic.List[string]]::new()

function Add-Violation {
    param([string]$Message)
    $violations.Add($Message)
}

function Get-RepoRelativePath {
    param([string]$Path)

    $root = (Resolve-Path -LiteralPath $repoRoot).Path.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $fullPath = (Resolve-Path -LiteralPath $Path).Path
    return $fullPath.Substring($root.Length + 1)
}

function Get-ProductionFile {
    param(
        [string]$ProjectDirectory,
        [string[]]$Patterns
    )

    $absoluteProjectDirectory = Join-Path $repoRoot $ProjectDirectory
    if (-not (Test-Path -LiteralPath $absoluteProjectDirectory)) {
        return @()
    }

    foreach ($pattern in $Patterns) {
        Get-ChildItem -LiteralPath $absoluteProjectDirectory -Recurse -File -Filter $pattern |
            Where-Object {
                $_.FullName -notmatch [regex]::Escape("\bin\") -and
                $_.FullName -notmatch [regex]::Escape("\obj\") -and
                $_.FullName -notmatch [regex]::Escape("\node_modules\")
            }
    }
}

# Nexo currently has a flat layout (no `src/` folder). As modules and shared
# projects are extracted, add them here and to $allowedProjectReferences.
$productionProjects = @(
    "Nexo.AppHost",
    "Nexo.Server"
)

$allowedProjectReferences = @{
    "Nexo.AppHost" = @("Nexo.Server")
    "Nexo.Server"  = @()
}

foreach ($projectDirectory in $productionProjects) {
    $projectDirectoryPath = Join-Path $repoRoot $projectDirectory
    if (-not (Test-Path -LiteralPath $projectDirectoryPath)) {
        continue
    }

    $projectFile = Get-ChildItem -LiteralPath $projectDirectoryPath -File -Filter "*.csproj" | Select-Object -First 1
    if ($null -eq $projectFile) {
        continue
    }

    [xml]$projectXml = Get-Content -LiteralPath $projectFile.FullName -Raw
    foreach ($reference in $projectXml.SelectNodes("//ProjectReference")) {
        $referenceProject = [System.IO.Path]::GetFileNameWithoutExtension($reference.Include)
        if ($allowedProjectReferences.ContainsKey($projectDirectory) -and
            $allowedProjectReferences[$projectDirectory] -notcontains $referenceProject) {
            Add-Violation "$projectDirectory references $referenceProject, which is not in the allowed reference list"
        }
    }
}

# No MediatR anywhere in production code (Mediator only, never MediatR).
foreach ($projectDirectory in $productionProjects) {
    foreach ($file in Get-ProductionFile -ProjectDirectory $projectDirectory -Patterns @("*.cs", "*.csproj")) {
        $relativePath = Get-RepoRelativePath -Path $file.FullName
        $content = Get-Content -LiteralPath $file.FullName -Raw
        if ($content.Contains("MediatR")) {
            Add-Violation "$relativePath contains MediatR (use Mediator, never MediatR)"
        }
    }
}

# No MVC controllers in Nexo.Server (FastEndpoints only).
foreach ($file in Get-ProductionFile -ProjectDirectory "Nexo.Server" -Patterns @("*.cs")) {
    $relativePath = Get-RepoRelativePath -Path $file.FullName
    $content = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($marker in @("ControllerBase", "AddControllers", "MapControllers")) {
        if ($content.Contains($marker)) {
            Add-Violation "$relativePath contains $marker (FastEndpoints only, no MVC controllers)"
        }
    }
}

# All HTTP routes are under /v1/ except /health and /alive.
foreach ($file in Get-ProductionFile -ProjectDirectory "Nexo.Server" -Patterns @("*.cs")) {
    $relativePath = Get-RepoRelativePath -Path $file.FullName
    $lineNumber = 0
    foreach ($line in Get-Content -LiteralPath $file.FullName) {
        $lineNumber++
        $match = [regex]::Match($line, '\b(?:Get|Post|Put|Patch|Delete)\("(?<route>[^"]+)"')
        if ($match.Success) {
            $route = $match.Groups["route"].Value
            if (-not $route.StartsWith("/v1/") -and $route -ne "/health" -and $route -ne "/alive") {
                Add-Violation "${relativePath}:$lineNumber uses unversioned route $route (expected /v1/... or /health or /alive)"
            }
        }
    }
}

# Provider SDK usage must stay behind module-owned Integrations folders, never
# in business logic. This list grows as real provider integrations land.
$providerMarkers = @("Keycloak.AuthServices", "Refit", "Polly")
foreach ($file in Get-ProductionFile -ProjectDirectory "Nexo.Server" -Patterns @("*.cs", "*.csproj")) {
    $relativePath = Get-RepoRelativePath -Path $file.FullName
    $isIntegrationFolder = $relativePath -match "[\\/]Integrations[\\/]"
    if ($isIntegrationFolder) {
        continue
    }

    $content = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($marker in $providerMarkers) {
        if ($content.Contains($marker)) {
            Add-Violation "$relativePath contains provider SDK marker $marker outside an Integrations folder"
        }
    }
}

# No DateTime.Now / direct DateTime.UtcNow; use TimeProvider.
foreach ($file in Get-ProductionFile -ProjectDirectory "Nexo.Server" -Patterns @("*.cs")) {
    $relativePath = Get-RepoRelativePath -Path $file.FullName
    $lineNumber = 0
    foreach ($line in Get-Content -LiteralPath $file.FullName) {
        $lineNumber++
        if ($line -match "DateTime\.Now\b" -or $line -match "DateTime\.UtcNow\b") {
            Add-Violation "${relativePath}:$lineNumber uses DateTime.Now/DateTime.UtcNow directly (use TimeProvider)"
        }
    }
}

if ($violations.Count -gt 0) {
    Write-Host "Architecture check failed:" -ForegroundColor Red
    foreach ($violation in $violations) {
        Write-Host " - $violation" -ForegroundColor Red
    }

    exit 1
}

Write-Host "Architecture check passed."
