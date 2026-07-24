# Run diarization test using PowerShell (handles Unicode paths correctly)
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"

$wavPath = "e:\测试\asr-engine\test_real.wav"
$segModel = "e:\测试\asr-engine\diarization\sherpa-onnx-pyannote-segmentation-3-0\model.onnx"
$embModel = "e:\测试\asr-engine\diarization\3dspeaker_speech_campplus_sv_zh-cn_16k-common.onnx"

Write-Host "Running diarization..."
Write-Host "  WAV: $wavPath"
Write-Host "  Seg: $segModel"
Write-Host "  Emb: $embModel"

& python "e:\测试\asr-engine\diarize.py" $wavPath $segModel $embModel 2 2>&1
