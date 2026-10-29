# stop-server.ps1 — 停止占用 8000 端口的本地服务器
#
# 由 stop-server.bat 调用。也可以直接用 PowerShell 运行。
#
# 两个实现上的坑，都踩过了，记在这里免得再犯：
#
# 1) 不要用批处理的 for /f 解析 netstat。
#    在 for /f "..." 的引号内部，转义后的 ^| 不按预期工作，
#    结果是静默失败、误报「没有服务器在跑」。
#
# 2) 不要用 Get-NetTCPConnection 判断端口。
#    在这台机器上它有时查不到明明在监听的端口（返回空、不报错），
#    而 netstat 始终准确。所以这里解析 netstat 文本。

$port = 8000

Write-Host ''
Write-Host "  Looking for a server on port $port ..."

# netstat -ano 的输出格式：
#   TCP    127.0.0.1:8000    0.0.0.0:0    LISTENING    9672
# 只取 LISTENING 且本地端口正好是 $port 的行（避免匹配到 :80000 之类），
# 最后一个字段就是 PID。
$pids = @()

foreach ($line in (netstat -ano)) {
    if ($line -match '^\s*TCP\s+\S+:' + $port + '\s+\S+\s+LISTENING\s+(\d+)\s*$') {
        $found = [int]$Matches[1]
        if ($pids -notcontains $found) { $pids += $found }
    }
}

if ($pids.Count -eq 0) {
    Write-Host ''
    Write-Host "  Nothing was listening on port $port. Nothing to stop."
    exit 0
}

foreach ($processId in $pids) {
    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { 'unknown' }
    Write-Host "  Stopping PID $processId ($name)"
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 800

# 复查
$still = netstat -ano | Where-Object {
    $_ -match '^\s*TCP\s+\S+:' + $port + '\s+\S+\s+LISTENING\s+\d+\s*$'
}

Write-Host ''
if ($still) {
    Write-Host "  WARNING: something is still listening on port $port."
} else {
    Write-Host "  Server stopped."
}
