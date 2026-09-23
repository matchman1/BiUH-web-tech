# Render selected pages of a PDF to PNG. Uses Windows.Data.Pdf (WinRT), PS 5.1.
# Keep this file pure ASCII: PS 5.1 misparses non-ASCII scripts without a BOM.

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -like 'IAsyncOperation*'
})[0]

$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
})[0]

if ($asTaskGeneric -eq $null) { throw 'asTaskGeneric not found' }
if ($asTaskAction  -eq $null) { throw 'asTaskAction not found' }

function Await($op, $resultType) {
    $m = $asTaskGeneric.MakeGenericMethod($resultType)
    $task = $m.Invoke($null, @($op))
    $task.Wait(-1) | Out-Null
    $task.Result
}

function AwaitAction($op) {
    $task = $asTaskAction.Invoke($null, @($op))
    $task.Wait(-1) | Out-Null
}

[Windows.Storage.StorageFile,                 Windows.Storage,         ContentType=WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument,                Windows.Data.Pdf,        ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null

$pdfPath = $args[0]
$outDir  = $args[1]
$first   = [int]$args[2]
$last    = [int]$args[3]
$scale   = if ($args.Count -ge 5) { [double]$args[4] } else { 2.0 }

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfPath)) ([Windows.Storage.StorageFile])
$doc  = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])

Write-Host ("PAGECOUNT=" + $doc.PageCount)

for ($i = $first; $i -le $last; $i++) {
    if ($i -gt $doc.PageCount) { break }

    $page = $doc.GetPage($i - 1)

    $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
    $opts.DestinationWidth  = [uint32][math]::Round($page.Size.Width  * $scale)
    $opts.DestinationHeight = [uint32][math]::Round($page.Size.Height * $scale)

    $outFile = Join-Path $outDir ("p{0:d3}.png" -f $i)
    New-Item -ItemType File -Force -Path $outFile | Out-Null

    $sf     = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($outFile)) ([Windows.Storage.StorageFile])
    $stream = Await ($sf.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)) ([Windows.Storage.Streams.IRandomAccessStream])

    AwaitAction ($page.RenderToStreamAsync($stream, $opts))

    $stream.Dispose()
    $page.Dispose()

    Write-Host ("RENDERED " + $i)
}

Write-Host "DONE"
