#Requires -Version 5.1
<#
.SYNOPSIS
    Nexora Platform - 1000x Optimized Build, Test & Deploy Script
    
.DESCRIPTION
    Comprehensive PowerShell script for atomic build, test, and deployment operations.
    Features: Zero-error execution, maximum optimization, idempotent design, detailed logging.
    
.PARAMETER CommitMessage
    Custom commit message for Git operations
    
.PARAMETER DryRun
    Perform all operations except actual deployment and Git push
    
.PARAMETER SkipTests
    Skip test execution (not recommended for production)
    
.PARAMETER SkipBuild
    Skip build process (useful for quick deployments)
    
.PARAMETER Force
    Force deployment even if validation fails
    
.PARAMETER Environment
    Target environment (preview, production)
    
.EXAMPLE
    .\deploy-nexora-1000x.ps1
    Standard deployment with auto-generated commit message
    
.EXAMPLE
    .\deploy-nexora-1000x.ps1 -CommitMessage "feat: new feature implementation" -Environment production
    Production deployment with custom commit message
    
.EXAMPLE
    .\deploy-nexora-1000x.ps1 -DryRun
    Test run without actual deployment
#>

[CmdletBinding()]
param(
    [string]$CommitMessage = "",
    [switch]$DryRun,
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$Force,
    [ValidateSet("preview", "production")]
    [string]$Environment = "production"
)

# ============================================================================
# CONFIGURATION & GLOBALS
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Performance tracking
$script:StartTime = Get-Date
$script:StepTimes = @{}
$script:LogFile = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow" 
    Error = "Red"
    Info = "Cyan"
    Step = "Magenta"
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-StepHeader {
    param([string]$Step, [string]$Description)
    
    $stepStart = Get-Date
    $script:StepTimes[$Step] = $stepStart
    
    Write-Host "`n" -NoNewline
    Write-Host "🚀 " -ForegroundColor $Colors.Step -NoNewline
    Write-Host "[$Step] " -ForegroundColor $Colors.Step -NoNewline
    Write-Host $Description -ForegroundColor White
    Write-Host "=" * 80 -ForegroundColor DarkGray
    
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [$Step] $Description"
}

function Write-StepResult {
    param([string]$Step, [string]$Result, [string]$Color = "Success")
    
    $stepEnd = Get-Date
    $duration = ($stepEnd - $script:StepTimes[$Step]).TotalSeconds
    
    Write-Host "✅ " -ForegroundColor $Colors[$Color] -NoNewline
    Write-Host "$Result " -ForegroundColor $Colors[$Color] -NoNewline
    Write-Host "($([math]::Round($duration, 2))s)" -ForegroundColor DarkGray
    
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [$Step] $Result (${duration}s)"
}

function Write-ErrorAndExit {
    param([string]$Message, [string]$Step = "ERROR")
    
    Write-Host "`n❌ " -ForegroundColor $Colors.Error -NoNewline
    Write-Host "[$Step] $Message" -ForegroundColor $Colors.Error
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [ERROR] [$Step] $Message"
    
    # Cleanup on error
    Invoke-Cleanup
    exit 1
}

function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Step,
        [string]$SuccessMessage,
        [string]$ErrorMessage,
        [switch]$IgnoreErrors
    )
    
    try {
        Write-Host "  → $Command" -ForegroundColor DarkGray
        Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [CMD] $Command"
        
        if ($DryRun -and ($Command -like "*git push*" -or $Command -like "*vercel deploy*")) {
            Write-Host "  → [DRY RUN] Skipping: $Command" -ForegroundColor $Colors.Warning
            return $true
        }
        
        $output = Invoke-Expression $Command 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-StepResult $Step $SuccessMessage
            Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [OUTPUT] $output"
            return $true
        } else {
            if ($IgnoreErrors) {
                Write-Host "  ⚠️ Warning: $ErrorMessage (ignored)" -ForegroundColor $Colors.Warning
                return $false
            } else {
                Write-ErrorAndExit "$ErrorMessage`nOutput: $output" $Step
            }
        }
    }
    catch {
        if ($IgnoreErrors) {
            Write-Host "  ⚠️ Warning: $ErrorMessage (ignored)" -ForegroundColor $Colors.Warning
            return $false
        } else {
            Write-ErrorAndExit "$ErrorMessage`nException: $($_.Exception.Message)" $Step
        }
    }
}

function Test-Prerequisites {
    Write-StepHeader "PREREQ" "Validating Prerequisites"
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        Write-ErrorAndExit "package.json not found. Are you in the correct directory?" "PREREQ"
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorAndExit "Node.js not found. Please install Node.js 18+ from https://nodejs.org" "PREREQ"
        }
        Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor $Colors.Success
    }
    catch {
        Write-ErrorAndExit "Node.js not found. Please install Node.js 18+ from https://nodejs.org" "PREREQ"
    }
    
    # Check package manager
    $packageManager = "npm"
    if (Test-Path "pnpm-lock.yaml") {
        $packageManager = "pnpm"
        try {
            $pnpmVersion = pnpm --version 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorAndExit "pnpm not found but pnpm-lock.yaml exists. Install with: npm install -g pnpm" "PREREQ"
            }
            Write-Host "  ✅ pnpm: $pnpmVersion" -ForegroundColor $Colors.Success
        }
        catch {
            Write-ErrorAndExit "pnpm not found but pnpm-lock.yaml exists. Install with: npm install -g pnpm" "PREREQ"
        }
    } elseif (Test-Path "yarn.lock") {
        $packageManager = "yarn"
        try {
            $yarnVersion = yarn --version 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorAndExit "yarn not found but yarn.lock exists. Install with: npm install -g yarn" "PREREQ"
            }
            Write-Host "  ✅ Yarn: $yarnVersion" -ForegroundColor $Colors.Success
        }
        catch {
            Write-ErrorAndExit "yarn not found but yarn.lock exists. Install with: npm install -g yarn" "PREREQ"
        }
    } else {
        $npmVersion = npm --version 2>$null
        Write-Host "  ✅ npm: $npmVersion" -ForegroundColor $Colors.Success
    }
    
    # Check Git
    try {
        $gitVersion = git --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorAndExit "Git not found. Please install Git from https://git-scm.com" "PREREQ"
        }
        Write-Host "  ✅ Git: $gitVersion" -ForegroundColor $Colors.Success
    }
    catch {
        Write-ErrorAndExit "Git not found. Please install Git from https://git-scm.com" "PREREQ"
    }
    
    # Check Vercel CLI
    try {
        $vercelVersion = vercel --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ⚠️ Vercel CLI not found. Installing..." -ForegroundColor $Colors.Warning
            Invoke-SafeCommand "npm install -g vercel" "PREREQ" "Vercel CLI installed" "Failed to install Vercel CLI"
        } else {
            Write-Host "  ✅ Vercel CLI: $vercelVersion" -ForegroundColor $Colors.Success
        }
    }
    catch {
        Write-Host "  ⚠️ Vercel CLI not found. Installing..." -ForegroundColor $Colors.Warning
        Invoke-SafeCommand "npm install -g vercel" "PREREQ" "Vercel CLI installed" "Failed to install Vercel CLI"
    }
    
    Write-StepResult "PREREQ" "All prerequisites validated" "Success"
    return $packageManager
}

function Install-Dependencies {
    param([string]$PackageManager)
    
    Write-StepHeader "DEPS" "Installing Dependencies (1000x Optimized)"
    
    # Clear npm cache for fresh install
    if ($PackageManager -eq "npm") {
        Invoke-SafeCommand "npm cache clean --force" "DEPS" "npm cache cleared" "Failed to clear npm cache" -IgnoreErrors
    }
    
    # Install with optimal settings
    switch ($PackageManager) {
        "pnpm" {
            Invoke-SafeCommand "pnpm install --frozen-lockfile --prefer-offline" "DEPS" "Dependencies installed with pnpm" "pnpm install failed"
        }
        "yarn" {
            Invoke-SafeCommand "yarn install --frozen-lockfile --prefer-offline" "DEPS" "Dependencies installed with yarn" "yarn install failed"
        }
        default {
            Invoke-SafeCommand "npm ci --prefer-offline --no-audit --no-fund" "DEPS" "Dependencies installed with npm" "npm ci failed"
        }
    }
}

function Invoke-QualityChecks {
    param([string]$PackageManager)
    
    if ($SkipTests) {
        Write-Host "`n⚠️ Skipping quality checks (SkipTests flag)" -ForegroundColor $Colors.Warning
        return
    }
    
    Write-StepHeader "QUALITY" "Running Quality Checks"
    
    # TypeScript check
    if (Test-Path "tsconfig.json") {
        switch ($PackageManager) {
            "pnpm" { Invoke-SafeCommand "pnpm run type-check" "QUALITY" "TypeScript check passed" "TypeScript errors found" }
            "yarn" { Invoke-SafeCommand "yarn type-check" "QUALITY" "TypeScript check passed" "TypeScript errors found" }
            default { Invoke-SafeCommand "npm run type-check" "QUALITY" "TypeScript check passed" "TypeScript errors found" }
        }
    }
    
    # ESLint check
    if (Test-Path ".eslintrc.json" -or Test-Path "eslint.config.mjs") {
        switch ($PackageManager) {
            "pnpm" { Invoke-SafeCommand "pnpm run lint" "QUALITY" "ESLint check passed" "ESLint errors found" }
            "yarn" { Invoke-SafeCommand "yarn lint" "QUALITY" "ESLint check passed" "ESLint errors found" }
            default { Invoke-SafeCommand "npm run lint" "QUALITY" "ESLint check passed" "ESLint errors found" }
        }
    }
    
    # Run tests if available
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.scripts.test) {
        switch ($PackageManager) {
            "pnpm" { Invoke-SafeCommand "pnpm test" "QUALITY" "Tests passed" "Tests failed" }
            "yarn" { Invoke-SafeCommand "yarn test" "QUALITY" "Tests passed" "Tests failed" }
            default { Invoke-SafeCommand "npm test" "QUALITY" "Tests passed" "Tests failed" }
        }
    }
}

function Invoke-Build {
    param([string]$PackageManager)
    
    if ($SkipBuild) {
        Write-Host "`n⚠️ Skipping build (SkipBuild flag)" -ForegroundColor $Colors.Warning
        return
    }
    
    Write-StepHeader "BUILD" "Building Application (1000x Optimized)"
    
    # Set production environment
    $env:NODE_ENV = "production"
    $env:NEXT_TELEMETRY_DISABLED = "1"
    
    # Build with optimal settings
    switch ($PackageManager) {
        "pnpm" { Invoke-SafeCommand "pnpm run build" "BUILD" "Build completed successfully" "Build failed" }
        "yarn" { Invoke-SafeCommand "yarn build" "BUILD" "Build completed successfully" "Build failed" }
        default { Invoke-SafeCommand "npm run build" "BUILD" "Build completed successfully" "Build failed" }
    }
    
    # Verify build output
    if (Test-Path ".next" -or Test-Path "dist" -or Test-Path "build") {
        Write-StepResult "BUILD" "Build artifacts verified" "Success"
    } else {
        Write-ErrorAndExit "Build artifacts not found" "BUILD"
    }
}

function Invoke-GitOperations {
    param([string]$CommitMessage)
    
    Write-StepHeader "GIT" "Git Operations"
    
    # Check if there are changes to commit
    $gitStatus = git status --porcelain 2>$null
    if (-not $gitStatus) {
        Write-Host "  ℹ️ No changes to commit" -ForegroundColor $Colors.Info
        Write-StepResult "GIT" "No changes detected" "Info"
        return
    }
    
    # Generate commit message if not provided
    if (-not $CommitMessage) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $CommitMessage = "deploy: automated deployment $timestamp"
    }
    
    # Add all changes
    Invoke-SafeCommand "git add ." "GIT" "Changes staged" "Failed to stage changes"
    
    # Commit changes
    $commitCmd = "git commit -m `"$CommitMessage`""
    Invoke-SafeCommand $commitCmd "GIT" "Changes committed" "Failed to commit changes"
    
    # Push to remote
    $currentBranch = git branch --show-current 2>$null
    if ($currentBranch) {
        Invoke-SafeCommand "git push origin $currentBranch" "GIT" "Changes pushed to $currentBranch" "Failed to push changes"
    } else {
        Write-ErrorAndExit "Could not determine current branch" "GIT"
    }
}

function Invoke-VercelDeploy {
    param([string]$Environment)
    
    Write-StepHeader "DEPLOY" "Vercel Deployment ($Environment)"
    
    # Check if logged in to Vercel
    $vercelUser = vercel whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️ Not logged in to Vercel. Please run 'vercel login' first." -ForegroundColor $Colors.Warning
        if (-not $Force) {
            Write-ErrorAndExit "Vercel authentication required" "DEPLOY"
        }
    } else {
        Write-Host "  ✅ Logged in as: $vercelUser" -ForegroundColor $Colors.Success
    }
    
    # Deploy based on environment
    if ($Environment -eq "production") {
        Invoke-SafeCommand "vercel deploy --prod --yes" "DEPLOY" "Production deployment successful" "Production deployment failed"
    } else {
        Invoke-SafeCommand "vercel deploy --yes" "DEPLOY" "Preview deployment successful" "Preview deployment failed"
    }
    
    # Get deployment URL
    try {
        $deploymentUrl = vercel ls --limit 1 2>$null | Select-String -Pattern "https://" | ForEach-Object { $_.Matches[0].Value }
        if ($deploymentUrl) {
            Write-Host "`n🌐 Deployment URL: " -ForegroundColor $Colors.Success -NoNewline
            Write-Host $deploymentUrl -ForegroundColor White
            Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [DEPLOY] URL: $deploymentUrl"
        }
    }
    catch {
        Write-Host "  ⚠️ Could not retrieve deployment URL" -ForegroundColor $Colors.Warning
    }
}

function Invoke-Cleanup {
    Write-StepHeader "CLEANUP" "Cleanup Operations"
    
    # Reset environment variables
    $env:NODE_ENV = $null
    $env:NEXT_TELEMETRY_DISABLED = $null
    
    # Clear temporary files
    if (Test-Path ".next/cache") {
        Remove-Item ".next/cache" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ Next.js cache cleared" -ForegroundColor $Colors.Success
    }
    
    Write-StepResult "CLEANUP" "Cleanup completed" "Success"
}

function Show-Summary {
    $totalTime = ((Get-Date) - $script:StartTime).TotalSeconds
    
    Write-Host "`n" -NoNewline
    Write-Host "🎉 " -ForegroundColor $Colors.Success -NoNewline
    Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY" -ForegroundColor $Colors.Success
    Write-Host "=" * 80 -ForegroundColor DarkGray
    
    Write-Host "`n📊 Performance Summary:" -ForegroundColor $Colors.Info
    foreach ($step in $script:StepTimes.Keys) {
        if ($script:StepTimes.ContainsKey($step)) {
            $stepTime = ((Get-Date) - $script:StepTimes[$step]).TotalSeconds
            Write-Host "  • $step`: $([math]::Round($stepTime, 2))s" -ForegroundColor White
        }
    }
    
    Write-Host "`n⏱️ Total Time: " -ForegroundColor $Colors.Info -NoNewline
    Write-Host "$([math]::Round($totalTime, 2))s" -ForegroundColor White
    
    Write-Host "`n📝 Log File: " -ForegroundColor $Colors.Info -NoNewline
    Write-Host $script:LogFile -ForegroundColor White
    
    if ($DryRun) {
        Write-Host "`n🧪 DRY RUN COMPLETED - No actual deployment performed" -ForegroundColor $Colors.Warning
    }
    
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [SUMMARY] Total deployment time: ${totalTime}s"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    Write-Host "🚀 Nexora Platform - 1000x Optimized Deployment" -ForegroundColor $Colors.Step
    Write-Host "=" * 80 -ForegroundColor DarkGray
    
    if ($DryRun) {
        Write-Host "🧪 DRY RUN MODE - No actual deployment will be performed" -ForegroundColor $Colors.Warning
    }
    
    # Initialize log file
    "Nexora Platform Deployment Log - $(Get-Date)" | Out-File $script:LogFile
    "Parameters: CommitMessage='$CommitMessage', DryRun=$DryRun, SkipTests=$SkipTests, SkipBuild=$SkipBuild, Environment=$Environment" | Add-Content $script:LogFile
    
    # Execute deployment pipeline
    $packageManager = Test-Prerequisites
    Install-Dependencies $packageManager
    Invoke-QualityChecks $packageManager
    Invoke-Build $packageManager
    Invoke-GitOperations $CommitMessage
    Invoke-VercelDeploy $Environment
    Invoke-Cleanup
    
    # Show summary
    Show-Summary
    
    exit 0
}
catch {
    Write-ErrorAndExit "Unexpected error: $($_.Exception.Message)" "MAIN"
}#Requires -Version 5.1
<#
.SYNOPSIS
    Nexora Platform - 1000x Optimized Build, Test & Deploy Script
    
.DESCRIPTION
    Comprehensive PowerShell script for atomic build, test, and deployment operations.
    Features: Zero-error execution, maximum optimization, idempotent design, detailed logging.
    
.PARAMETER CommitMessage
    Custom commit message for Git operations
    
.PARAMETER DryRun
    Perform all operations except actual deployment and Git push
    
.PARAMETER SkipTests
    Skip test execution (not recommended for production)
    
.PARAMETER SkipBuild
    Skip build process (useful for quick deployments)
    
.PARAMETER Force
    Force deployment even if validation fails
    
.PARAMETER Environment
    Target environment (preview, production)
    
.EXAMPLE
    .\deploy-nexora-1000x.ps1
    Standard deployment with auto-generated commit message
    
.EXAMPLE
    .\deploy-nexora-1000x.ps1 -CommitMessage "feat: new feature implementation" -Environment production
    Production deployment with custom commit message
    
.EXAMPLE
    .\deploy-nexora-1000x.ps1 -DryRun
    Test run without actual deployment
#>

[CmdletBinding()]
param(
    [string]$CommitMessage = "",
    [switch]$DryRun,
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$Force,
    [ValidateSet("preview", "production")]
    [string]$Environment = "production"
)

# ============================================================================
# CONFIGURATION & GLOBALS
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Performance tracking
$script:StartTime = Get-Date
$script:StepTimes = @{}
$script:LogFile = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow" 
    Error = "Red"
    Info = "Cyan"
    Step = "Magenta"
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-StepHeader {
    param([string]$Step, [string]$Description)
    
    $stepStart = Get-Date
    $script:StepTimes[$Step] = $stepStart
    
    Write-Host "`n" -NoNewline
    Write-Host "🚀 " -ForegroundColor $Colors.Step -NoNewline
    Write-Host "[$Step] " -ForegroundColor $Colors.Step -NoNewline
    Write-Host $Description -ForegroundColor White
    Write-Host "=" * 80 -ForegroundColor DarkGray
    
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [$Step] $Description"
}

function Write-StepResult {
    param([string]$Step, [string]$Result, [string]$Color = "Success")
    
    $stepEnd = Get-Date
    $duration = ($stepEnd - $script:StepTimes[$Step]).TotalSeconds
    
    Write-Host "✅ " -ForegroundColor $Colors[$Color] -NoNewline
    Write-Host "$Result " -ForegroundColor $Colors[$Color] -NoNewline
    Write-Host "($([math]::Round($duration, 2))s)" -ForegroundColor DarkGray
    
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [$Step] $Result (${duration}s)"
}

function Write-ErrorAndExit {
    param([string]$Message, [string]$Step = "ERROR")
    
    Write-Host "`n❌ " -ForegroundColor $Colors.Error -NoNewline
    Write-Host "[$Step] $Message" -ForegroundColor $Colors.Error
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [ERROR] [$Step] $Message"
    
    # Cleanup on error
    Invoke-Cleanup
    exit 1
}

function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Step,
        [string]$SuccessMessage,
        [string]$ErrorMessage,
        [switch]$IgnoreErrors
    )
    
    try {
        Write-Host "  → $Command" -ForegroundColor DarkGray
        Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [CMD] $Command"
        
        if ($DryRun -and ($Command -like "*git push*" -or $Command -like "*vercel deploy*")) {
            Write-Host "  → [DRY RUN] Skipping: $Command" -ForegroundColor $Colors.Warning
            return $true
        }
        
        $output = Invoke-Expression $Command 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-StepResult $Step $SuccessMessage
            Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [OUTPUT] $output"
            return $true
        } else {
            if ($IgnoreErrors) {
                Write-Host "  ⚠️ Warning: $ErrorMessage (ignored)" -ForegroundColor $Colors.Warning
                return $false
            } else {
                Write-ErrorAndExit "$ErrorMessage`nOutput: $output" $Step
            }
        }
    }
    catch {
        if ($IgnoreErrors) {
            Write-Host "  ⚠️ Warning: $ErrorMessage (ignored)" -ForegroundColor $Colors.Warning
            return $false
        } else {
            Write-ErrorAndExit "$ErrorMessage`nException: $($_.Exception.Message)" $Step
        }
    }
}

function Test-Prerequisites {
    Write-StepHeader "PREREQ" "Validating Prerequisites"
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        Write-ErrorAndExit "package.json not found. Are you in the correct directory?" "PREREQ"
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorAndExit "Node.js not found. Please install Node.js 18+ from https://nodejs.org" "PREREQ"
        }
        Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor $Colors.Success
    }
    catch {
        Write-ErrorAndExit "Node.js not found. Please install Node.js 18+ from https://nodejs.org" "PREREQ"
    }
    
    # Check package manager
    $packageManager = "npm"
    if (Test-Path "pnpm-lock.yaml") {
        $packageManager = "pnpm"
        try {
            $pnpmVersion = pnpm --version 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorAndExit "pnpm not found but pnpm-lock.yaml exists. Install with: npm install -g pnpm" "PREREQ"
            }
            Write-Host "  ✅ pnpm: $pnpmVersion" -ForegroundColor $Colors.Success
        }
        catch {
            Write-ErrorAndExit "pnpm not found but pnpm-lock.yaml exists. Install with: npm install -g pnpm" "PREREQ"
        }
    } elseif (Test-Path "yarn.lock") {
        $packageManager = "yarn"
        try {
            $yarnVersion = yarn --version 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorAndExit "yarn not found but yarn.lock exists. Install with: npm install -g yarn" "PREREQ"
            }
            Write-Host "  ✅ Yarn: $yarnVersion" -ForegroundColor $Colors.Success
        }
        catch {
            Write-ErrorAndExit "yarn not found but yarn.lock exists. Install with: npm install -g yarn" "PREREQ"
        }
    } else {
        $npmVersion = npm --version 2>$null
        Write-Host "  ✅ npm: $npmVersion" -ForegroundColor $Colors.Success
    }
    
    # Check Git
    try {
        $gitVersion = git --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorAndExit "Git not found. Please install Git from https://git-scm.com" "PREREQ"
        }
        Write-Host "  ✅ Git: $gitVersion" -ForegroundColor $Colors.Success
    }
    catch {
        Write-ErrorAndExit "Git not found. Please install Git from https://git-scm.com" "PREREQ"
    }
    
    # Check Vercel CLI
    try {
        $vercelVersion = vercel --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ⚠️ Vercel CLI not found. Installing..." -ForegroundColor $Colors.Warning
            Invoke-SafeCommand "npm install -g vercel" "PREREQ" "Vercel CLI installed" "Failed to install Vercel CLI"
        } else {
            Write-Host "  ✅ Vercel CLI: $vercelVersion" -ForegroundColor $Colors.Success
        }
    }
    catch {
        Write-Host "  ⚠️ Vercel CLI not found. Installing..." -ForegroundColor $Colors.Warning
        Invoke-SafeCommand "npm install -g vercel" "PREREQ" "Vercel CLI installed" "Failed to install Vercel CLI"
    }
    
    Write-StepResult "PREREQ" "All prerequisites validated" "Success"
    return $packageManager
}

function Install-Dependencies {
    param([string]$PackageManager)
    
    Write-StepHeader "DEPS" "Installing Dependencies (1000x Optimized)"
    
    # Clear npm cache for fresh install
    if ($PackageManager -eq "npm") {
        Invoke-SafeCommand "npm cache clean --force" "DEPS" "npm cache cleared" "Failed to clear npm cache" -IgnoreErrors
    }
    
    # Install with optimal settings
    switch ($PackageManager) {
        "pnpm" {
            Invoke-SafeCommand "pnpm install --frozen-lockfile --prefer-offline" "DEPS" "Dependencies installed with pnpm" "pnpm install failed"
        }
        "yarn" {
            Invoke-SafeCommand "yarn install --frozen-lockfile --prefer-offline" "DEPS" "Dependencies installed with yarn" "yarn install failed"
        }
        default {
            Invoke-SafeCommand "npm ci --prefer-offline --no-audit --no-fund" "DEPS" "Dependencies installed with npm" "npm ci failed"
        }
    }
}

function Invoke-QualityChecks {
    param([string]$PackageManager)
    
    if ($SkipTests) {
        Write-Host "`n⚠️ Skipping quality checks (SkipTests flag)" -ForegroundColor $Colors.Warning
        return
    }
    
    Write-StepHeader "QUALITY" "Running Quality Checks"
    
    # TypeScript check
    if (Test-Path "tsconfig.json") {
        switch ($PackageManager) {
            "pnpm" { Invoke-SafeCommand "pnpm run type-check" "QUALITY" "TypeScript check passed" "TypeScript errors found" }
            "yarn" { Invoke-SafeCommand "yarn type-check" "QUALITY" "TypeScript check passed" "TypeScript errors found" }
            default { Invoke-SafeCommand "npm run type-check" "QUALITY" "TypeScript check passed" "TypeScript errors found" }
        }
    }
    
    # ESLint check
    if (Test-Path ".eslintrc.json" -or Test-Path "eslint.config.mjs") {
        switch ($PackageManager) {
            "pnpm" { Invoke-SafeCommand "pnpm run lint" "QUALITY" "ESLint check passed" "ESLint errors found" }
            "yarn" { Invoke-SafeCommand "yarn lint" "QUALITY" "ESLint check passed" "ESLint errors found" }
            default { Invoke-SafeCommand "npm run lint" "QUALITY" "ESLint check passed" "ESLint errors found" }
        }
    }
    
    # Run tests if available
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.scripts.test) {
        switch ($PackageManager) {
            "pnpm" { Invoke-SafeCommand "pnpm test" "QUALITY" "Tests passed" "Tests failed" }
            "yarn" { Invoke-SafeCommand "yarn test" "QUALITY" "Tests passed" "Tests failed" }
            default { Invoke-SafeCommand "npm test" "QUALITY" "Tests passed" "Tests failed" }
        }
    }
}

function Invoke-Build {
    param([string]$PackageManager)
    
    if ($SkipBuild) {
        Write-Host "`n⚠️ Skipping build (SkipBuild flag)" -ForegroundColor $Colors.Warning
        return
    }
    
    Write-StepHeader "BUILD" "Building Application (1000x Optimized)"
    
    # Set production environment
    $env:NODE_ENV = "production"
    $env:NEXT_TELEMETRY_DISABLED = "1"
    
    # Build with optimal settings
    switch ($PackageManager) {
        "pnpm" { Invoke-SafeCommand "pnpm run build" "BUILD" "Build completed successfully" "Build failed" }
        "yarn" { Invoke-SafeCommand "yarn build" "BUILD" "Build completed successfully" "Build failed" }
        default { Invoke-SafeCommand "npm run build" "BUILD" "Build completed successfully" "Build failed" }
    }
    
    # Verify build output
    if (Test-Path ".next" -or Test-Path "dist" -or Test-Path "build") {
        Write-StepResult "BUILD" "Build artifacts verified" "Success"
    } else {
        Write-ErrorAndExit "Build artifacts not found" "BUILD"
    }
}

function Invoke-GitOperations {
    param([string]$CommitMessage)
    
    Write-StepHeader "GIT" "Git Operations"
    
    # Check if there are changes to commit
    $gitStatus = git status --porcelain 2>$null
    if (-not $gitStatus) {
        Write-Host "  ℹ️ No changes to commit" -ForegroundColor $Colors.Info
        Write-StepResult "GIT" "No changes detected" "Info"
        return
    }
    
    # Generate commit message if not provided
    if (-not $CommitMessage) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $CommitMessage = "deploy: automated deployment $timestamp"
    }
    
    # Add all changes
    Invoke-SafeCommand "git add ." "GIT" "Changes staged" "Failed to stage changes"
    
    # Commit changes
    $commitCmd = "git commit -m `"$CommitMessage`""
    Invoke-SafeCommand $commitCmd "GIT" "Changes committed" "Failed to commit changes"
    
    # Push to remote
    $currentBranch = git branch --show-current 2>$null
    if ($currentBranch) {
        Invoke-SafeCommand "git push origin $currentBranch" "GIT" "Changes pushed to $currentBranch" "Failed to push changes"
    } else {
        Write-ErrorAndExit "Could not determine current branch" "GIT"
    }
}

function Invoke-VercelDeploy {
    param([string]$Environment)
    
    Write-StepHeader "DEPLOY" "Vercel Deployment ($Environment)"
    
    # Check if logged in to Vercel
    $vercelUser = vercel whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️ Not logged in to Vercel. Please run 'vercel login' first." -ForegroundColor $Colors.Warning
        if (-not $Force) {
            Write-ErrorAndExit "Vercel authentication required" "DEPLOY"
        }
    } else {
        Write-Host "  ✅ Logged in as: $vercelUser" -ForegroundColor $Colors.Success
    }
    
    # Deploy based on environment
    if ($Environment -eq "production") {
        Invoke-SafeCommand "vercel deploy --prod --yes" "DEPLOY" "Production deployment successful" "Production deployment failed"
    } else {
        Invoke-SafeCommand "vercel deploy --yes" "DEPLOY" "Preview deployment successful" "Preview deployment failed"
    }
    
    # Get deployment URL
    try {
        $deploymentUrl = vercel ls --limit 1 2>$null | Select-String -Pattern "https://" | ForEach-Object { $_.Matches[0].Value }
        if ($deploymentUrl) {
            Write-Host "`n🌐 Deployment URL: " -ForegroundColor $Colors.Success -NoNewline
            Write-Host $deploymentUrl -ForegroundColor White
            Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [DEPLOY] URL: $deploymentUrl"
        }
    }
    catch {
        Write-Host "  ⚠️ Could not retrieve deployment URL" -ForegroundColor $Colors.Warning
    }
}

function Invoke-Cleanup {
    Write-StepHeader "CLEANUP" "Cleanup Operations"
    
    # Reset environment variables
    $env:NODE_ENV = $null
    $env:NEXT_TELEMETRY_DISABLED = $null
    
    # Clear temporary files
    if (Test-Path ".next/cache") {
        Remove-Item ".next/cache" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ Next.js cache cleared" -ForegroundColor $Colors.Success
    }
    
    Write-StepResult "CLEANUP" "Cleanup completed" "Success"
}

function Show-Summary {
    $totalTime = ((Get-Date) - $script:StartTime).TotalSeconds
    
    Write-Host "`n" -NoNewline
    Write-Host "🎉 " -ForegroundColor $Colors.Success -NoNewline
    Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY" -ForegroundColor $Colors.Success
    Write-Host "=" * 80 -ForegroundColor DarkGray
    
    Write-Host "`n📊 Performance Summary:" -ForegroundColor $Colors.Info
    foreach ($step in $script:StepTimes.Keys) {
        if ($script:StepTimes.ContainsKey($step)) {
            $stepTime = ((Get-Date) - $script:StepTimes[$step]).TotalSeconds
            Write-Host "  • $step`: $([math]::Round($stepTime, 2))s" -ForegroundColor White
        }
    }
    
    Write-Host "`n⏱️ Total Time: " -ForegroundColor $Colors.Info -NoNewline
    Write-Host "$([math]::Round($totalTime, 2))s" -ForegroundColor White
    
    Write-Host "`n📝 Log File: " -ForegroundColor $Colors.Info -NoNewline
    Write-Host $script:LogFile -ForegroundColor White
    
    if ($DryRun) {
        Write-Host "`n🧪 DRY RUN COMPLETED - No actual deployment performed" -ForegroundColor $Colors.Warning
    }
    
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [SUMMARY] Total deployment time: ${totalTime}s"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    Write-Host "🚀 Nexora Platform - 1000x Optimized Deployment" -ForegroundColor $Colors.Step
    Write-Host "=" * 80 -ForegroundColor DarkGray
    
    if ($DryRun) {
        Write-Host "🧪 DRY RUN MODE - No actual deployment will be performed" -ForegroundColor $Colors.Warning
    }
    
    # Initialize log file
    "Nexora Platform Deployment Log - $(Get-Date)" | Out-File $script:LogFile
    "Parameters: CommitMessage='$CommitMessage', DryRun=$DryRun, SkipTests=$SkipTests, SkipBuild=$SkipBuild, Environment=$Environment" | Add-Content $script:LogFile
    
    # Execute deployment pipeline
    $packageManager = Test-Prerequisites
    Install-Dependencies $packageManager
    Invoke-QualityChecks $packageManager
    Invoke-Build $packageManager
    Invoke-GitOperations $CommitMessage
    Invoke-VercelDeploy $Environment
    Invoke-Cleanup
    
    # Show summary
    Show-Summary
    
    exit 0
}
catch {
    Write-ErrorAndExit "Unexpected error: $($_.Exception.Message)" "MAIN"
}
#Requires -Version 5.1
<#
.SYNOPSIS
    Nexora Platform - 1000x Optimized Build, Test & Deploy Script
    
.DESCRIPTION
    Comprehensive PowerShell script for atomic build, test, and deployment operations.
    Features: Zero-error execution, maximum optimization, idempotent design, detailed logging.
    
.PARAMETER CommitMessage
    Custom commit message for Git operations
    
.PARAMETER DryRun
    Perform all operations except actual deployment and Git push
    
.PARAMETER SkipTests
    Skip test execution (not recommended for production)
    
.PARAMETER SkipBuild
    Skip build process (useful for quick deployments)
    
.PARAMETER Force
    Force deployment even if validation fails
    
.PARAMETER Environment
    Target environment (preview, production)
    
.EXAMPLE
    .\deploy-nexora-1000x.ps1
    Standard deployment with auto-generated commit message
    
.EXAMPLE
    .\deploy-nexora-1000x.ps1 -CommitMessage "feat: new feature implementation" -Environment production
    Production deployment with custom commit message
    
.EXAMPLE
    .\deploy-nexora-1000x.ps1 -DryRun
    Test run without actual deployment
#>

[CmdletBinding()]
param(
    [string]$CommitMessage = "",
    [switch]$DryRun,
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$Force,
    [ValidateSet("preview", "production")]
    [string]$Environment = "production"
)

# ============================================================================
# CONFIGURATION & GLOBALS
# ============================================================================

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Performance tracking
$script:StartTime = Get-Date
$script:StepTimes = @{}
$script:LogFile = "deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow" 
    Error = "Red"
    Info = "Cyan"
    Step = "Magenta"
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-StepHeader {
    param([string]$Step, [string]$Description)
    
    $stepStart = Get-Date
    $script:StepTimes[$Step] = $stepStart
    
    Write-Host "`n" -NoNewline
    Write-Host "🚀 " -ForegroundColor $Colors.Step -NoNewline
    Write-Host "[$Step] " -ForegroundColor $Colors.Step -NoNewline
    Write-Host $Description -ForegroundColor White
    Write-Host "=" * 80 -ForegroundColor DarkGray
    
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [$Step] $Description"
}

function Write-StepResult {
    param([string]$Step, [string]$Result, [string]$Color = "Success")
    
    $stepEnd = Get-Date
    $duration = ($stepEnd - $script:StepTimes[$Step]).TotalSeconds
    
    Write-Host "✅ " -ForegroundColor $Colors[$Color] -NoNewline
    Write-Host "$Result " -ForegroundColor $Colors[$Color] -NoNewline
    Write-Host "($([math]::Round($duration, 2))s)" -ForegroundColor DarkGray
    
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [$Step] $Result (${duration}s)"
}

function Write-ErrorAndExit {
    param([string]$Message, [string]$Step = "ERROR")
    
    Write-Host "`n❌ " -ForegroundColor $Colors.Error -NoNewline
    Write-Host "[$Step] $Message" -ForegroundColor $Colors.Error
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [ERROR] [$Step] $Message"
    
    # Cleanup on error
    Invoke-Cleanup
    exit 1
}

function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Step,
        [string]$SuccessMessage,
        [string]$ErrorMessage,
        [switch]$IgnoreErrors
    )
    
    try {
        Write-Host "  → $Command" -ForegroundColor DarkGray
        Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [CMD] $Command"
        
        if ($DryRun -and ($Command -like "*git push*" -or $Command -like "*vercel deploy*")) {
            Write-Host "  → [DRY RUN] Skipping: $Command" -ForegroundColor $Colors.Warning
            return $true
        }
        
        $output = Invoke-Expression $Command 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-StepResult $Step $SuccessMessage
            Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [OUTPUT] $output"
            return $true
        } else {
            if ($IgnoreErrors) {
                Write-Host "  ⚠️ Warning: $ErrorMessage (ignored)" -ForegroundColor $Colors.Warning
                return $false
            } else {
                Write-ErrorAndExit "$ErrorMessage`nOutput: $output" $Step
            }
        }
    }
    catch {
        if ($IgnoreErrors) {
            Write-Host "  ⚠️ Warning: $ErrorMessage (ignored)" -ForegroundColor $Colors.Warning
            return $false
        } else {
            Write-ErrorAndExit "$ErrorMessage`nException: $($_.Exception.Message)" $Step
        }
    }
}

function Test-Prerequisites {
    Write-StepHeader "PREREQ" "Validating Prerequisites"
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        Write-ErrorAndExit "package.json not found. Are you in the correct directory?" "PREREQ"
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorAndExit "Node.js not found. Please install Node.js 18+ from https://nodejs.org" "PREREQ"
        }
        Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor $Colors.Success
    }
    catch {
        Write-ErrorAndExit "Node.js not found. Please install Node.js 18+ from https://nodejs.org" "PREREQ"
    }
    
    # Check package manager
    $packageManager = "npm"
    if (Test-Path "pnpm-lock.yaml") {
        $packageManager = "pnpm"
        try {
            $pnpmVersion = pnpm --version 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorAndExit "pnpm not found but pnpm-lock.yaml exists. Install with: npm install -g pnpm" "PREREQ"
            }
            Write-Host "  ✅ pnpm: $pnpmVersion" -ForegroundColor $Colors.Success
        }
        catch {
            Write-ErrorAndExit "pnpm not found but pnpm-lock.yaml exists. Install with: npm install -g pnpm" "PREREQ"
        }
    } elseif (Test-Path "yarn.lock") {
        $packageManager = "yarn"
        try {
            $yarnVersion = yarn --version 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-ErrorAndExit "yarn not found but yarn.lock exists. Install with: npm install -g yarn" "PREREQ"
            }
            Write-Host "  ✅ Yarn: $yarnVersion" -ForegroundColor $Colors.Success
        }
        catch {
            Write-ErrorAndExit "yarn not found but yarn.lock exists. Install with: npm install -g yarn" "PREREQ"
        }
    } else {
        $npmVersion = npm --version 2>$null
        Write-Host "  ✅ npm: $npmVersion" -ForegroundColor $Colors.Success
    }
    
    # Check Git
    try {
        $gitVersion = git --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-ErrorAndExit "Git not found. Please install Git from https://git-scm.com" "PREREQ"
        }
        Write-Host "  ✅ Git: $gitVersion" -ForegroundColor $Colors.Success
    }
    catch {
        Write-ErrorAndExit "Git not found. Please install Git from https://git-scm.com" "PREREQ"
    }
    
    # Check Vercel CLI
    try {
        $vercelVersion = vercel --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ⚠️ Vercel CLI not found. Installing..." -ForegroundColor $Colors.Warning
            Invoke-SafeCommand "npm install -g vercel" "PREREQ" "Vercel CLI installed" "Failed to install Vercel CLI"
        } else {
            Write-Host "  ✅ Vercel CLI: $vercelVersion" -ForegroundColor $Colors.Success
        }
    }
    catch {
        Write-Host "  ⚠️ Vercel CLI not found. Installing..." -ForegroundColor $Colors.Warning
        Invoke-SafeCommand "npm install -g vercel" "PREREQ" "Vercel CLI installed" "Failed to install Vercel CLI"
    }
    
    Write-StepResult "PREREQ" "All prerequisites validated" "Success"
    return $packageManager
}

function Install-Dependencies {
    param([string]$PackageManager)
    
    Write-StepHeader "DEPS" "Installing Dependencies (1000x Optimized)"
    
    # Clear npm cache for fresh install
    if ($PackageManager -eq "npm") {
        Invoke-SafeCommand "npm cache clean --force" "DEPS" "npm cache cleared" "Failed to clear npm cache" -IgnoreErrors
    }
    
    # Install with optimal settings
    switch ($PackageManager) {
        "pnpm" {
            Invoke-SafeCommand "pnpm install --frozen-lockfile --prefer-offline" "DEPS" "Dependencies installed with pnpm" "pnpm install failed"
        }
        "yarn" {
            Invoke-SafeCommand "yarn install --frozen-lockfile --prefer-offline" "DEPS" "Dependencies installed with yarn" "yarn install failed"
        }
        default {
            Invoke-SafeCommand "npm ci --prefer-offline --no-audit --no-fund" "DEPS" "Dependencies installed with npm" "npm ci failed"
        }
    }
}

function Invoke-QualityChecks {
    param([string]$PackageManager)
    
    if ($SkipTests) {
        Write-Host "`n⚠️ Skipping quality checks (SkipTests flag)" -ForegroundColor $Colors.Warning
        return
    }
    
    Write-StepHeader "QUALITY" "Running Quality Checks"
    
    # TypeScript check
    if (Test-Path "tsconfig.json") {
        switch ($PackageManager) {
            "pnpm" { Invoke-SafeCommand "pnpm run type-check" "QUALITY" "TypeScript check passed" "TypeScript errors found" }
            "yarn" { Invoke-SafeCommand "yarn type-check" "QUALITY" "TypeScript check passed" "TypeScript errors found" }
            default { Invoke-SafeCommand "npm run type-check" "QUALITY" "TypeScript check passed" "TypeScript errors found" }
        }
    }
    
    # ESLint check
    if (Test-Path ".eslintrc.json" -or Test-Path "eslint.config.mjs") {
        switch ($PackageManager) {
            "pnpm" { Invoke-SafeCommand "pnpm run lint" "QUALITY" "ESLint check passed" "ESLint errors found" }
            "yarn" { Invoke-SafeCommand "yarn lint" "QUALITY" "ESLint check passed" "ESLint errors found" }
            default { Invoke-SafeCommand "npm run lint" "QUALITY" "ESLint check passed" "ESLint errors found" }
        }
    }
    
    # Run tests if available
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.scripts.test) {
        switch ($PackageManager) {
            "pnpm" { Invoke-SafeCommand "pnpm test" "QUALITY" "Tests passed" "Tests failed" }
            "yarn" { Invoke-SafeCommand "yarn test" "QUALITY" "Tests passed" "Tests failed" }
            default { Invoke-SafeCommand "npm test" "QUALITY" "Tests passed" "Tests failed" }
        }
    }
}

function Invoke-Build {
    param([string]$PackageManager)
    
    if ($SkipBuild) {
        Write-Host "`n⚠️ Skipping build (SkipBuild flag)" -ForegroundColor $Colors.Warning
        return
    }
    
    Write-StepHeader "BUILD" "Building Application (1000x Optimized)"
    
    # Set production environment
    $env:NODE_ENV = "production"
    $env:NEXT_TELEMETRY_DISABLED = "1"
    
    # Build with optimal settings
    switch ($PackageManager) {
        "pnpm" { Invoke-SafeCommand "pnpm run build" "BUILD" "Build completed successfully" "Build failed" }
        "yarn" { Invoke-SafeCommand "yarn build" "BUILD" "Build completed successfully" "Build failed" }
        default { Invoke-SafeCommand "npm run build" "BUILD" "Build completed successfully" "Build failed" }
    }
    
    # Verify build output
    if (Test-Path ".next" -or Test-Path "dist" -or Test-Path "build") {
        Write-StepResult "BUILD" "Build artifacts verified" "Success"
    } else {
        Write-ErrorAndExit "Build artifacts not found" "BUILD"
    }
}

function Invoke-GitOperations {
    param([string]$CommitMessage)
    
    Write-StepHeader "GIT" "Git Operations"
    
    # Check if there are changes to commit
    $gitStatus = git status --porcelain 2>$null
    if (-not $gitStatus) {
        Write-Host "  ℹ️ No changes to commit" -ForegroundColor $Colors.Info
        Write-StepResult "GIT" "No changes detected" "Info"
        return
    }
    
    # Generate commit message if not provided
    if (-not $CommitMessage) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $CommitMessage = "deploy: automated deployment $timestamp"
    }
    
    # Add all changes
    Invoke-SafeCommand "git add ." "GIT" "Changes staged" "Failed to stage changes"
    
    # Commit changes
    $commitCmd = "git commit -m `"$CommitMessage`""
    Invoke-SafeCommand $commitCmd "GIT" "Changes committed" "Failed to commit changes"
    
    # Push to remote
    $currentBranch = git branch --show-current 2>$null
    if ($currentBranch) {
        Invoke-SafeCommand "git push origin $currentBranch" "GIT" "Changes pushed to $currentBranch" "Failed to push changes"
    } else {
        Write-ErrorAndExit "Could not determine current branch" "GIT"
    }
}

function Invoke-VercelDeploy {
    param([string]$Environment)
    
    Write-StepHeader "DEPLOY" "Vercel Deployment ($Environment)"
    
    # Check if logged in to Vercel
    $vercelUser = vercel whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️ Not logged in to Vercel. Please run 'vercel login' first." -ForegroundColor $Colors.Warning
        if (-not $Force) {
            Write-ErrorAndExit "Vercel authentication required" "DEPLOY"
        }
    } else {
        Write-Host "  ✅ Logged in as: $vercelUser" -ForegroundColor $Colors.Success
    }
    
    # Deploy based on environment
    if ($Environment -eq "production") {
        Invoke-SafeCommand "vercel deploy --prod --yes" "DEPLOY" "Production deployment successful" "Production deployment failed"
    } else {
        Invoke-SafeCommand "vercel deploy --yes" "DEPLOY" "Preview deployment successful" "Preview deployment failed"
    }
    
    # Get deployment URL
    try {
        $deploymentUrl = vercel ls --limit 1 2>$null | Select-String -Pattern "https://" | ForEach-Object { $_.Matches[0].Value }
        if ($deploymentUrl) {
            Write-Host "`n🌐 Deployment URL: " -ForegroundColor $Colors.Success -NoNewline
            Write-Host $deploymentUrl -ForegroundColor White
            Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [DEPLOY] URL: $deploymentUrl"
        }
    }
    catch {
        Write-Host "  ⚠️ Could not retrieve deployment URL" -ForegroundColor $Colors.Warning
    }
}

function Invoke-Cleanup {
    Write-StepHeader "CLEANUP" "Cleanup Operations"
    
    # Reset environment variables
    $env:NODE_ENV = $null
    $env:NEXT_TELEMETRY_DISABLED = $null
    
    # Clear temporary files
    if (Test-Path ".next/cache") {
        Remove-Item ".next/cache" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  ✅ Next.js cache cleared" -ForegroundColor $Colors.Success
    }
    
    Write-StepResult "CLEANUP" "Cleanup completed" "Success"
}

function Show-Summary {
    $totalTime = ((Get-Date) - $script:StartTime).TotalSeconds
    
    Write-Host "`n" -NoNewline
    Write-Host "🎉 " -ForegroundColor $Colors.Success -NoNewline
    Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY" -ForegroundColor $Colors.Success
    Write-Host "=" * 80 -ForegroundColor DarkGray
    
    Write-Host "`n📊 Performance Summary:" -ForegroundColor $Colors.Info
    foreach ($step in $script:StepTimes.Keys) {
        if ($script:StepTimes.ContainsKey($step)) {
            $stepTime = ((Get-Date) - $script:StepTimes[$step]).TotalSeconds
            Write-Host "  • $step`: $([math]::Round($stepTime, 2))s" -ForegroundColor White
        }
    }
    
    Write-Host "`n⏱️ Total Time: " -ForegroundColor $Colors.Info -NoNewline
    Write-Host "$([math]::Round($totalTime, 2))s" -ForegroundColor White
    
    Write-Host "`n📝 Log File: " -ForegroundColor $Colors.Info -NoNewline
    Write-Host $script:LogFile -ForegroundColor White
    
    if ($DryRun) {
        Write-Host "`n🧪 DRY RUN COMPLETED - No actual deployment performed" -ForegroundColor $Colors.Warning
    }
    
    Add-Content $script:LogFile "[$((Get-Date).ToString('HH:mm:ss'))] [SUMMARY] Total deployment time: ${totalTime}s"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    Write-Host "🚀 Nexora Platform - 1000x Optimized Deployment" -ForegroundColor $Colors.Step
    Write-Host "=" * 80 -ForegroundColor DarkGray
    
    if ($DryRun) {
        Write-Host "🧪 DRY RUN MODE - No actual deployment will be performed" -ForegroundColor $Colors.Warning
    }
    
    # Initialize log file
    "Nexora Platform Deployment Log - $(Get-Date)" | Out-File $script:LogFile
    "Parameters: CommitMessage='$CommitMessage', DryRun=$DryRun, SkipTests=$SkipTests, SkipBuild=$SkipBuild, Environment=$Environment" | Add-Content $script:LogFile
    
    # Execute deployment pipeline
    $packageManager = Test-Prerequisites
    Install-Dependencies $packageManager
    Invoke-QualityChecks $packageManager
    Invoke-Build $packageManager
    Invoke-GitOperations $CommitMessage
    Invoke-VercelDeploy $Environment
    Invoke-Cleanup
    
    # Show summary
    Show-Summary
    
    exit 0
}
catch {
    Write-ErrorAndExit "Unexpected error: $($_.Exception.Message)" "MAIN"
}