$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = if ($args.Count -gt 0) { [int]$args[0] } else { 8765 }
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()

$types = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".svg" = "image/svg+xml"
  ".webmanifest" = "application/manifest+json; charset=utf-8"
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 1200
    $client.SendTimeout = 1200
    $stream = $client.GetStream()
    $buffer = [byte[]]::new(8192)
    $read = $stream.Read($buffer, 0, $buffer.Length)
    if ($read -le 0) { continue }
    $requestText = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
    $requestLine = ($requestText -split "`r?`n")[0]
    if (-not $requestLine) { continue }

    $parts = $requestLine.Split(" ")
    $urlPath = [System.Uri]::UnescapeDataString($parts[1].Split("?")[0])
    if ($urlPath -eq "/") { $urlPath = "/index.html" }
    $relative = $urlPath.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
    $file = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relative))

    if (-not $file.StartsWith($root) -or -not [System.IO.File]::Exists($file)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $header = "HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $bytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Write($body, 0, $body.Length)
      continue
    }

    $body = [System.IO.File]::ReadAllBytes($file)
    $ext = [System.IO.Path]::GetExtension($file)
    $type = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
    $header = "HTTP/1.1 200 OK`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Write($body, 0, $body.Length)
  } catch {
    try {
      $body = [System.Text.Encoding]::UTF8.GetBytes("Server error")
      $header = "HTTP/1.1 500 Internal Server Error`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
      $bytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Write($body, 0, $body.Length)
    } catch {}
  } finally {
    $client.Close()
  }
}
