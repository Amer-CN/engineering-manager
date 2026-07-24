#!/usr/bin/env python3
# coding=utf-8
"""
transcribe.py — Qwen3-ASR GGUF 命令行入口

10.12 修复：在模块最顶部强制 stdout/stderr 为严格 UTF-8。
新增 --encoding-check 诊断模式：不加载模型，输出固定中文后退出。
"""

import os
import sys
import time
from pathlib import Path
from typing import List, Optional

# ═══════════════════════════════════════════════════════════
# 10.12 UTF-8 生产端修复：在任何其他输出之前强制 stdout/stderr 为严格 UTF-8
# ═══════════════════════════════════════════════════════════
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='strict')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='strict')

# 获取项目根目录
if getattr(sys, 'frozen', False):
    PROJ_DIR = Path(sys.executable).parent
else:
    PROJ_DIR = Path(__file__).resolve().parent

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()
app = typer.Typer(
    help="""
    使用 Qwen3-ASR GGUF 模型进行音频的高精度转录
    """,
    no_args_is_help=True
)


def get_model_filenames(precision: str = "int4", is_aligner: bool = False) -> dict:
    """根据精度选择模型文件"""
    prefix = "qwen3_aligner" if is_aligner else "qwen3_asr"
    return {
        "frontend": f"{prefix}_encoder_frontend.{precision}.onnx",
        "backend": f"{prefix}_encoder_backend.{precision}.onnx",
        "llm": f"{prefix}_llm.q4_k.gguf" if not is_aligner else f"{prefix}_llm.q4_k.gguf",
    }


def check_model_files(config) -> list:
    """检查模型文件是否完整"""
    missing_files = []
    asr_files = get_model_filenames()
    for f in [asr_files["frontend"], asr_files["backend"], asr_files["llm"]]:
        path = Path(config.model_dir) / "model" / f
        if not path.exists():
            missing_files.append(f)
    if config.enable_aligner and config.align_config:
        align_files = get_model_filenames(is_aligner=True)
        for f in [align_files["frontend"], align_files["backend"], align_files["llm"]]:
            path = Path(config.model_dir) / "model" / f
            if not path.exists():
                missing_files.append(f)
    return missing_files


@app.command()
def transcribe(
    files: List[Path] = typer.Argument(..., help="要转录的音频文件列表"),
    model_dir: str = typer.Option(str(PROJ_DIR), "--model-dir", help="模型根目录"),
    precision: str = typer.Option("int4", "--prec", help="推理精度: fp32, fp16, int8, int4"),
    timestamp: bool = typer.Option(False, "--timestamp/--no-ts", help="是否时间戳对齐"),
    use_dml: bool = typer.Option(False, "--dml/--no-dml", help="是否使用 DirectML 后端"),
    use_vulkan: bool = typer.Option(True, "--vulkan/--no-vulkan", help="是否用 Vulkan 后端"),
    n_ctx: int = typer.Option(2048, "--n-ctx", help="LLM 上下文窗口大小"),
    language: str = typer.Option("auto", "--language", help="强制指定语言 (如: Chinese, English)"),
    context: str = typer.Option("", "--context", help="上下文提示词 (Prompt)"),
    temperature: float = typer.Option(0.0, "--temperature"),
    seek_start: float = typer.Option(0.0, "--seek-start", help="音频起始位置 (秒)"),
    duration: float = typer.Option(0.0, "--duration", help="截取音频时长 (秒)"),
    chunk_size: float = typer.Option(40.0, "--chunk-size", help="分段识别时长 (秒)"),
    memory_num: int = typer.Option(1, "--memory-num", help="记忆历史片段数量"),
    verbose: bool = typer.Option(True, "--verbose/--quiet"),
):
    """转录音频文件"""
    from qwen_asr_gguf.inference.schema import ASREngineConfig, AlignerConfig
    from qwen_asr_gguf.inference import QwenASREngine, exporters

    # 设置 Vulkan 环境变量
    if use_vulkan:
        os.environ.setdefault("GGML_VULKAN_DEVICE", "0")

    asr_files = get_model_filenames(precision)
    align_config = None
    if timestamp:
        align_files = get_model_filenames(precision, is_aligner=True)
        align_config = AlignerConfig(
            model_dir=model_dir,
            encoder_frontend_fn=align_files["frontend"],
            encoder_backend_fn=align_files["backend"],
            llm_fn=align_files["llm"],
            use_dml=use_dml,
        )

    config = ASREngineConfig(
        model_dir=model_dir,
        encoder_frontend_fn=asr_files["frontend"],
        encoder_backend_fn=asr_files["backend"],
        llm_fn=asr_files["llm"],
        use_dml=use_dml,
        n_ctx=n_ctx,
        chunk_size=chunk_size,
        memory_num=memory_num,
        verbose=verbose,
        enable_aligner=timestamp,
        align_config=align_config,
    )

    # 配置表
    config_table = Table(title="[bold cyan]Qwen3-ASR 转录选项[/bold cyan]")
    config_table.add_row("模型目录", f"[green]{model_dir}[/green]")
    config_table.add_row("推理精度", f"[cyan]{precision}[/cyan]")
    config_table.add_row("加速设备", f"DML: {'[green]ON[/green]' if use_dml else '[red]OFF[/red]'} | Vulkan: {'[green]ON[/green]' if use_vulkan else '[red]OFF[/red]'}")
    if timestamp:
        config_table.add_row("时间戳对齐", "[green]启用[/green]")
    else:
        config_table.add_row("时间戳对齐", "[red]禁用[/red]")
    if language != "auto":
        config_table.add_row("语言", language)
    else:
        config_table.add_row("语言设置", "自动识别")
    console.print(config_table)

    # 检查模型文件
    missing = check_model_files(config)
    if missing:
        console.print(f"[yellow]以下文件缺失: {', '.join(missing)}[/yellow]")

    # 初始化引擎
    console.print("[bold yellow]正在初始化引擎，请稍后...[/bold yellow]")
    status = console.status("[bold green]加载模型中...[/bold green]")
    t0 = time.time()
    try:
        engine = QwenASREngine(config)
        init_duration = time.time() - t0
        console.print(f"--- [QwenASR] 引擎初始化耗时: {init_duration:.1f} 秒 ---")
        status.start()
    except Exception as e:
        console.print(f"[bold red]引擎初始化失败:[/bold red]\n{e}")
        console.print("[bold yellow]尝试以下操作:[/bold yellow]")
        console.print("  1. 尝试关闭 DirectML 后端: 使用 [cyan]--no-dml[/cyan]")
        console.print("  2. 尝试关闭 Vulkan 后端: 使用 [cyan]--no-vulkan[/cyan]")
        console.print("  3. 如果仍然失败，请到 GitHub 提交 Issue 并附上 [cyan]" + str(PROJ_DIR) + "\\logs\\latest.log[/cyan] 日志文件。")
        raise typer.Exit(1)
    finally:
        status.stop()

    # 转录每个文件
    for audio_path in files:
        if not audio_path.exists():
            console.print(f"[red]文件不存在: {audio_path}[/red]")
            continue

        base_out = audio_path.with_suffix('')
        txt_out = base_out.with_suffix('.txt')
        if txt_out.exists():
            if not typer.confirm(f"{txt_out} 已存在，是否覆盖?"):
                continue

        console.print(f"\n[bold blue]开始转录:[/bold blue] {audio_path.name}")
        res = engine.transcribe(
            str(audio_path),
            language=language if language != "auto" else None,
            hot_words=context if context else None,
        )

        # 导出
        exporters.export_to_txt(res, str(txt_out))
        console.print(f"  [green]文本已保存:[/green] {txt_out}")

        if timestamp:
            srt_out = base_out.with_suffix('.srt')
            exporters.export_to_srt(res.alignment, str(srt_out))
            console.print(f"  [green]字幕已保存:[/green] {srt_out}")

        json_out = base_out.with_suffix('.json')
        exporters.export_to_json(res, str(json_out))
        console.print(f"  [green]JSON已保存:[/green] {json_out}")

    console.print("\n[bold green]所有转录完成。[/bold green]")
    engine.shutdown()


@app.command()
def encoding_check():
    """
    10.12 诊断模式：不加载模型，输出固定中文到 stdout/stderr 后退出。
    用于验证 transcribe.exe 的 stdout/stderr 原始字节为有效 UTF-8。
    """
    # stdout 输出
    print("Qwen3-ASR 编码诊断模式")
    print("配置选项")
    print("全部层")
    print("模型目录")
    print("推理精度")
    print("加速设备")
    print("时间戳对齐")
    print("语言设置")
    print("自动识别")
    print("正在初始化引擎，请稍后...")
    print("引擎初始化失败")
    print("尝试以下操作:")
    print("如果仍然失败，请到 GitHub 提交 Issue")
    print("日志文件。")
    print("文件不存在")
    print("文本已保存")
    print("字幕已保存")
    print("JSON已保存")
    print("所有转录完成。")

    # stderr 输出
    print("引擎初始化耗时", file=sys.stderr)
    print("开始转录", file=sys.stderr)
    print("高内存告警", file=sys.stderr)
    print("资源保险丝", file=sys.stderr)

    print("OK: UTF-8 编码诊断完成")
    sys.exit(0)


@app.command()
def dependency_check():
    """
    10.16 诊断模式：不加载模型，执行与正常转写相同的导入链直到模型加载前。
    校验 inference 模块、onnxruntime 版本/路径/providers，以及外部
    llama/Vulkan 二进制和模型文件的解析路径。任一缺失必须非零退出。
    """
    import traceback
    import importlib

    errors = []
    warnings = []

    print("=" * 60)
    print("Qwen3-ASR 依赖检查 (dependency-check)")
    print("不加载模型，只验证导入链和文件路径")
    print("=" * 60)
    print()

    # 1. 检查 PROJ_DIR
    print(f"[1] PROJ_DIR: {PROJ_DIR}")
    if not PROJ_DIR.exists():
        errors.append(f"PROJ_DIR 不存在: {PROJ_DIR}")
    else:
        print(f"    OK: PROJ_DIR 存在")
    print()

    # 2. 检查 qwen_asr_gguf.inference 导入
    print("[2] 导入 qwen_asr_gguf.inference...")
    try:
        from qwen_asr_gguf.inference import QwenASREngine, exporters
        print(f"    OK: QwenASREngine 导入成功")
        print(f"    OK: exporters 导入成功")
    except Exception as e:
        errors.append(f"qwen_asr_gguf.inference 导入失败: {e}")
        print(f"    FAIL: {e}")
        traceback.print_exc()
        # 如果导入失败，后面的检查没有意义
        print()
        print(f"结果: FAIL ({len(errors)} 个错误)")
        sys.exit(1)
    print()

    # 3. 检查 onnxruntime
    print("[3] 导入 onnxruntime...")
    try:
        import onnxruntime as ort
        print(f"    OK: onnxruntime 版本: {ort.__version__}")
        print(f"    OK: onnxruntime 路径: {ort.__file__}")
        providers = ort.get_available_providers()
        print(f"    OK: 可用 providers: {providers}")
        if 'CPUExecutionProvider' not in providers:
            warnings.append("CPUExecutionProvider 不可用")
    except Exception as e:
        errors.append(f"onnxruntime 导入失败: {e}")
        print(f"    FAIL: {e}")
        traceback.print_exc()
    print()

    # 4. 检查 numpy
    print("[4] 导入 numpy...")
    try:
        import numpy as np
        print(f"    OK: numpy 版本: {np.__version__}")
        print(f"    OK: numpy 路径: {np.__file__}")
    except Exception as e:
        errors.append(f"numpy 导入失败: {e}")
        print(f"    FAIL: {e}")
    print()

    # 5. 检查 schema 模块
    print("[5] 导入 qwen_asr_gguf.inference.schema...")
    try:
        from qwen_asr_gguf.inference.schema import ASREngineConfig, AlignerConfig
        print(f"    OK: ASREngineConfig 导入成功")
        print(f"    OK: AlignerConfig 导入成功")
    except Exception as e:
        errors.append(f"schema 导入失败: {e}")
        print(f"    FAIL: {e}")
    print()

    # 6. 检查 llama 模块（ctypes 加载 llama.cpp DLL）
    print("[6] 导入 qwen_asr_gguf.inference.llama...")
    try:
        from qwen_asr_gguf.inference import llama as llama_mod
        print(f"    OK: llama 模块导入成功")
    except Exception as e:
        errors.append(f"llama 模块导入失败: {e}")
        print(f"    FAIL: {e}")
        traceback.print_exc()
    print()

    # 7. 检查外部 llama/Vulkan 二进制文件
    bin_dir = PROJ_DIR / "qwen_asr_gguf" / "inference" / "bin"
    print(f"[7] 检查外部二进制目录: {bin_dir}")
    if not bin_dir.exists():
        errors.append(f"二进制目录不存在: {bin_dir}")
        print(f"    FAIL: 目录不存在")
    else:
        print(f"    OK: 目录存在")
        # 检查关键 DLL
        for dll in ["ggml-vulkan.dll", "llama.dll", "ggml.dll"]:
            dll_path = bin_dir / dll
            if dll_path.exists():
                size_mb = dll_path.stat().st_size / (1024 * 1024)
                print(f"    OK: {dll} ({size_mb:.1f} MB)")
            else:
                errors.append(f"缺失 DLL: {dll}")
                print(f"    FAIL: {dll} 不存在")
    print()

    # 8. 检查模型文件
    model_dir = PROJ_DIR / "model"
    print(f"[8] 检查模型目录: {model_dir}")
    if not model_dir.exists():
        errors.append(f"模型目录不存在: {model_dir}")
        print(f"    FAIL: 目录不存在")
    else:
        print(f"    OK: 目录存在")
        asr_files = get_model_filenames()
        for name, f in asr_files.items():
            fpath = model_dir / f
            if fpath.exists():
                size_mb = fpath.stat().st_size / (1024 * 1024)
                print(f"    OK: {name}={f} ({size_mb:.1f} MB)")
            else:
                errors.append(f"缺失模型文件: {f}")
                print(f"    FAIL: {name}={f} 不存在")
    print()

    # 9. 检查日志目录
    log_dir = PROJ_DIR / "logs"
    log_file = log_dir / "latest.log"
    print(f"[9] 检查日志路径: {log_file}")
    if not log_dir.exists():
        try:
            log_dir.mkdir(parents=True, exist_ok=True)
            print(f"    OK: 日志目录已创建: {log_dir}")
        except Exception as e:
            errors.append(f"日志目录创建失败: {e}")
            print(f"    FAIL: 无法创建日志目录: {e}")
    else:
        print(f"    OK: 日志目录已存在")
    print()

    # 10. 检查 hotwords.txt
    hotwords_path = PROJ_DIR / "hotwords.txt"
    print(f"[10] 检查 hotwords.txt: {hotwords_path}")
    if hotwords_path.exists():
        print(f"    OK: hotwords.txt 存在")
    else:
        warnings.append("hotwords.txt 不存在（非致命）")
        print(f"    WARN: hotwords.txt 不存在")
    print()

    # 汇总
    print("=" * 60)
    print(f"结果: {'PASS' if not errors else 'FAIL'} ({len(errors)} 个错误, {len(warnings)} 个警告)")
    if warnings:
        print("警告:")
        for w in warnings:
            print(f"  WARN: {w}")
    if errors:
        print("错误:")
        for e in errors:
            print(f"  FAIL: {e}")
    print("=" * 60)

    sys.exit(0 if not errors else 1)


@app.command()
def vulkan_check():
    """
    10.16 诊断模式：无模型 RX580/Vulkan 设备枚举。
    调用 llama.cpp ggml_backend_load_all() 触发 Vulkan 后端加载，
    输出设备列表到 latest.log，不加载任何模型。
    """
    import os, sys, time
    from pathlib import Path

    print("=" * 60)
    print("Qwen3-ASR Vulkan 设备枚举 (vulkan-check)")
    print("不加载模型，只初始化后端并枚举设备")
    print("=" * 60)
    print()

    # 路径打印
    if getattr(sys, 'frozen', False):
        exe_path = Path(sys.executable).resolve()
        root_dir = exe_path.parent
    else:
        exe_path = Path(__file__).resolve()
        root_dir = exe_path.parent

    print(f"transcribe.exe: {exe_path}")
    print(f"ROOT_DIR:       {root_dir}")
    print(f"log file:       {root_dir / 'logs' / 'latest.log'}")
    print()

    # 清理旧日志
    log_file = root_dir / "logs" / "latest.log"
    if log_file.exists():
        log_file.unlink()
    log_file.parent.mkdir(parents=True, exist_ok=True)

    # 导入 llama 模块（触发 __init__.py setup_logging）
    print("[1] 导入 qwen_asr_gguf.inference.llama...")
    try:
        from qwen_asr_gguf.inference import llama as llama_mod
        print("    OK: llama 模块导入成功")
    except Exception as e:
        print(f"    FAIL: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    print()

    # 调用 init_llama_lib() — 触发 ggml_backend_load_all()
    print("[2] 初始化 llama.cpp 后端 (ggml_backend_load_all + llama_backend_init)...")
    t0 = time.time()
    try:
        llama_mod.init_llama_lib()
        elapsed = time.time() - t0
        print(f"    OK: 后端初始化完成 ({elapsed:.1f}s)")
    except Exception as e:
        elapsed = time.time() - t0
        print(f"    FAIL: {e} ({elapsed:.1f}s)")
        import traceback; traceback.print_exc()
        sys.exit(1)
    print()

    # 读取日志文件
    print("[3] 读取 latest.log...")
    time.sleep(0.5)  # 等待日志 flush
    if log_file.exists() and log_file.stat().st_size > 0:
        log_content = log_file.read_text(encoding='utf-8')
        print(f"    OK: latest.log 存在 ({log_file.stat().st_size} bytes)")
        print("    --- 日志内容 ---")
        for line in log_content.strip().split('\n'):
            print(f"    {line}")
        print("    --- end ---")
        print()

        # 验证关键标记
        has_vulkan = 'Vulkan' in log_content
        has_rx580 = 'RX 580' in log_content or 'Radeon RX 580' in log_content
        has_backend = 'load_backend' in log_content or 'loaded' in log_content.lower()

        print("[4] 验证关键标记:")
        print(f"    Vulkan backend loaded: {has_vulkan}")
        print(f"    RX 580 device found:    {has_rx580}")
        print(f"    Backend load markers:  {has_backend}")
        print()

        if has_vulkan and has_rx580:
            print("=" * 60)
            print("结果: PASS — Vulkan 后端已加载，RX 580 设备已枚举")
            print(f"latest.log: {log_file} ({log_file.stat().st_size} bytes)")
            print(f"C# SttMonitorLoop 读取路径: {log_file}")
            print("=" * 60)
            sys.exit(0)
        else:
            print("=" * 60)
            print("结果: FAIL — Vulkan 或 RX 580 未在日志中确认")
            print("=" * 60)
            sys.exit(1)
    else:
        print(f"    FAIL: latest.log 不存在或为空")
        print("=" * 60)
        print("结果: FAIL — latest.log 未产生内容")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    app()
