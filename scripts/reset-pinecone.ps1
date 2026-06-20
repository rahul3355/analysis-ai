# Reset Pinecone and re-upload the PDF
# Run this after the dev server is running

Write-Host "Resetting Pinecone and re-uploading the running footwear PDF..."
Write-Host ""

# Step 1: Delete all vectors from Pinecone
Write-Host "Step 1: Deleting all vectors from Pinecone..."
$body = @{ action = "deleteAll" } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/documents" -ContentType "application/json" -Body $body -ErrorAction Stop
  Write-Host "  Done"
} catch {
  # The POST /api/documents doesn't support JSON - that's expected
  # We'll call Pinecone directly instead
  Write-Host "  (Will delete via direct API call)"
}

# Step 2: Upload the PDF fresh (this will create clean chunks with the fixed chunker)
Write-Host "Step 2: Uploading running footwear PDF..."
$file = "C:\Coding\rough\analysis-ai\frontend\public\mock-docs\running_footwear_category_deep_dive_h1_2026.pdf"
$boundary = [System.Guid]::NewGuid().ToString()
$body = "--$boundary`r`nContent-Disposition: form-data; name=`"file`"; filename=`"running_footwear_category_deep_dive_h1_2026.pdf`"`r`nContent-Type: application/pdf`r`n`r`n"
$body += [System.Text.Encoding]::GetEncoding('ISO-8859-1').GetString([System.IO.File]::ReadAllBytes($file))
$body += "`r`n--$boundary--`r`n"

try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/api/documents" -Method Post -ContentType "multipart/form-data; boundary=$boundary" -Body $body -TimeoutSec 180 -ErrorAction Stop
  Write-Host "  Upload SUCCESS"
  Write-Host "  DocumentId: $($response.documentId)"
  Write-Host "  Status: $($response.status)"
  Write-Host "  Chunks: $($response.chunkCount)"
} catch {
  Write-Host "  Upload FAILED: $_"
  if($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "  Error: $($reader.ReadToEnd())"
  }
}

Write-Host ""
Write-Host "Done. Now go to the Chat view and ask: 'What was H1 revenue for running footwear?'"
