# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['transcribe.py'],
    pathex=[],
    binaries=[],
    datas=[('qwen_asr_gguf', 'qwen_asr_gguf')],
    hiddenimports=['typer', 'rich', 'qwen_asr_gguf.inference', 'qwen_asr_gguf.inference.llama', 'qwen_asr_gguf.inference.asr', 'qwen_asr_gguf.inference.aligner', 'qwen_asr_gguf.inference.encoder', 'qwen_asr_gguf.inference.exporters', 'qwen_asr_gguf.inference.chinese_itn', 'qwen_asr_gguf.inference.schema', 'qwen_asr_gguf.inference.utils', 'qwen_asr_gguf.inference.asr_worker'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['torch', 'numba', 'matplotlib', 'pandas', 'sklearn', 'PIL', 'cv2'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='transcribe',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
