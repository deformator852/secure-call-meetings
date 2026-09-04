# Expose the app ports on the Windows LAN IP (needs Administrator).
# Phone should open https://<this-pc-wifi-ip>:3443.

$ErrorActionPreference = "Stop"
$ports = 3000, 3443
$wslIp = (wsl -e sh -c "ip -4 -o addr show eth0 | awk '{print `$4}' | cut -d/ -f1").Trim()
if (-not $wslIp) {
  $wslIp = "127.0.0.1"
}
Write-Host "Forwarding LAN -> ${wslIp}"

foreach ($port in $ports) {
  netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=$port | Out-Null
  netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$port connectaddress=$wslIp connectport=$port
}

Remove-NetFirewallRule -DisplayName "secure-calls-LAN" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "secure-calls-LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $ports -Profile Any | Out-Null

Write-Host "Portproxy:"
netsh interface portproxy show all
Write-Host "Open on the phone (same Wi-Fi):"
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Ethernet' -and $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '172.22.*' } |
  ForEach-Object { Write-Host ("  https://{0}:3443" -f $_.IPAddress) }
