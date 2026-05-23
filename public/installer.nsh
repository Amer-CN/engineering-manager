; ══════════════════════════════════════════════════════════════════════════
; 工程管家 安装器自定义脚本
; ══════════════════════════════════════════════════════════════════════════

!include "MUI2.nsh"

; 抑制 Page Custom 函数被误判为未引用的警告
!pragma warning disable 6010

!define APP_CONFIG_DIR "$APPDATA\engineering-manager"

; ── 安装包界面品牌 ──
; header 位图由 package.json 的 nsis.installerHeader 配置
; welcome 侧栏位图使用 electron-builder 内置 Metro 风格
; 背景色保持默认白色（确保文字可读）

Var DataDir
Var DataDirDialog
Var DataDirButton

; ── 欢迎页 ──
!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

; ── 安装前：确保能检测到旧版安装 ──
!macro preInit
  ; 不删注册表，让 electron-builder 能识别旧版安装路径
!macroend

; ── 初始化：设置默认数据路径 ──
!macro customInit
  StrCpy $DataDir "D:\Company Database"
!macroend

; ── 安装目录页之后：显示数据存储路径选择页 ──
!macro customPageAfterChangeDir
  Page Custom DataDirPage DataDirLeave
!macroend

; ── 数据目录自定义页面 ──
Function DataDirPage
  !insertmacro MUI_HEADER_TEXT "数据存储路径" "选择工程管家的数据文件存储位置"
  nsDialogs::Create 1018
  Pop $DataDirDialog

  ${If} $DataDirDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 20u 100% 14u "示例数据、上传文件、配置文件将存储在此目录。$\n可以设置为已有的数据目录来迁移数据。"
  Pop $0

  ${NSD_CreateDirRequest} 0 60u 75% 14u "$DataDir"
  Pop $1
  ${NSD_CreateBrowseButton} 78% 58u 22% 17u "浏览..."
  Pop $DataDirButton
  ${NSD_OnClick} $DataDirButton OnDataDirBrowse

  nsDialogs::Show
FunctionEnd

Function OnDataDirBrowse
  ${NSD_GetText} $1 $0
  nsDialogs::SelectFolderDialog "选择数据存储目录" $0
  Pop $0
  ${If} $0 != error
    ${NSD_SetText} $1 $0
  ${EndIf}
FunctionEnd

; ── 数据目录页离开时：校验目录 ──
Function DataDirLeave
  ${NSD_GetText} $1 $DataDir
  ${If} $DataDir == ""
    MessageBox MB_ICONEXCLAMATION "请选择数据存储路径或使用默认路径。"
    Abort
  ${EndIf}
FunctionEnd

; ── 安装完成：写入 config.json 到 %APPDATA%\engineering-manager ──
; 如果已存在则不覆盖（保留原有数据路径，避免 JSON 格式兼容问题）
!macro customInstall
  IfFileExists "${APP_CONFIG_DIR}\config.json" done_cfg
    CreateDirectory "${APP_CONFIG_DIR}"
    FileOpen $0 "${APP_CONFIG_DIR}\config.json" w
    FileWrite $0 '{"dataPath":"$DataDir"}$\r$\n'
    FileClose $0
  done_cfg:
  CreateDirectory "$DataDir"
  CreateDirectory "$DataDir\uploads"
!macroend
