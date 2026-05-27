$content = Get-Content -Path 'public/app.js' -Raw
$regex = '(?s)const dbRazas = \{.*?\r?\n    \]\r?\n\};'
$match = [regex]::Match($content, $regex)

if ($match.Success) {
    $dbContent = "window.dbRazas = " + $match.Value.Substring(14)
    Set-Content -Path 'public/razas.js' -Value $dbContent -Encoding UTF8
    
    $newContent = $content -replace $regex, 'const dbRazas = window.dbRazas;'
    Set-Content -Path 'public/app.js' -Value $newContent -Encoding UTF8
    
    Write-Host "dbRazas extracted successfully!"
} else {
    Write-Host "Could not find dbRazas."
}
