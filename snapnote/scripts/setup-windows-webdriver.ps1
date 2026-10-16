$ErrorActionPreference = 'Stop'

# Windows Server runners do not guarantee an installed Evergreen WebView2 runtime.
$installer = Join-Path $env:RUNNER_TEMP 'MicrosoftEdgeWebview2Setup.exe'
Invoke-WebRequest 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $installer
$install = Start-Process $installer -ArgumentList '/silent', '/install' -Wait -PassThru
Write-Host "WebView2 installer exit: $($install.ExitCode)"

$locations = @(
    "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application",
    "$env:ProgramFiles\Microsoft\EdgeWebView\Application",
    "$env:LOCALAPPDATA\Microsoft\EdgeWebView\Application"
)
$runtime = $locations | Where-Object { Test-Path $_ } |
    ForEach-Object { Get-ChildItem $_ -Directory } |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
    Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
if (-not $runtime) { throw 'No WebView2 runtime was found after installation.' }
$runtimeVersion = $runtime.Name
$build = ($runtimeVersion.Split('.')[0..2] -join '.')
Write-Host "WebView2 runtime: $runtimeVersion at $($runtime.FullName)"

$driver = if ($env:EDGEWEBDRIVER) {
    Join-Path $env:EDGEWEBDRIVER 'msedgedriver.exe'
} else {
    (Get-Command msedgedriver.exe -ErrorAction SilentlyContinue).Source
}
$driverVersion = if ($driver -and (Test-Path $driver)) { & $driver --version } else { '' }
if ($driverVersion -notmatch [regex]::Escape($build + '.')) {
    $directory = Join-Path $env:RUNNER_TEMP 'snapnote-edge-driver'
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $archive = Join-Path $env:RUNNER_TEMP 'snapnote-edge-driver.zip'
    try {
        Invoke-WebRequest "https://msedgedriver.microsoft.com/$runtimeVersion/edgedriver_win64.zip" -OutFile $archive
    } catch {
        $major = $runtimeVersion.Split('.')[0]
        $version = (Invoke-RestMethod "https://msedgedriver.microsoft.com/LATEST_RELEASE_${major}_WINDOWS").Trim()
        Invoke-WebRequest "https://msedgedriver.microsoft.com/$version/edgedriver_win64.zip" -OutFile $archive
    }
    Expand-Archive $archive -DestinationPath $directory -Force
    $driver = Join-Path $directory 'msedgedriver.exe'
    $driverVersion = & $driver --version
}
if ($driverVersion -notmatch [regex]::Escape($build + '.')) {
    throw "Driver mismatch: $driverVersion; WebView2: $runtimeVersion"
}
Write-Host "WebDriver: $driverVersion"
"EDGEWEBDRIVER=$(Split-Path $driver)" >> $env:GITHUB_ENV
