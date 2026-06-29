; ═══════════════════════════════════════════════════════════════
; 工程管家 - Inno Setup 安装包脚本
; 需要安装 Inno Setup 6 (https://jrsoftware.org/isdl.php)
; 编译: iscc installer.iss
; 或通过 build.bat 自动调用
; ═══════════════════════════════════════════════════════════════

#define MyAppName "工程管家"
#define MyAppVersion "0.79.0"
#define MyAppPublisher "Reasonix"
#define MyAppExeName "EngineeringManager.Api.exe"
#define MyAppDescription "工程项目管理系统 - 一站式工程项目管理解决方案"

; 通过命令行覆盖版本号
#ifndef VERSION
  #define VERSION MyAppVersion
#endif

; 通过命令行覆盖发布目录
#ifndef PUBLISH_DIR
  #define PUBLISH_DIR "release\engineering-manager-" + VERSION
#endif

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#VERSION}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=release
OutputBaseFilename=工程管家-Setup-{#VERSION}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=100
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
DisableDirPage=no
AllowNoIcons=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; 安装包图标
SetupIconFile=src-tauri\icons\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

; 版本信息
VersionInfoVersion={#VERSION}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppDescription}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#VERSION}

; 界面设置
WizardSmallImageFile=src-tauri\icons\32x32.png

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "default"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; 主程序 + 所有运行时文件
Source: "{#PUBLISH_DIR}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; OCR 配置（预置百度 API Key，用户无需配置）
Source: "{#PUBLISH_DIR}\ocr-config.json"; DestDir: "{app}"; Flags: ignoreversion

[Dirs]
Name: "{app}\dist"; Flags: uninsalwaysuninstall
Name: "{app}\uploads"; Flags: uninsneveruninstall

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\dist"
Type: filesandordirs; Name: "{app}\uploads"

; 数据目录保留在 %APPDATA%/工程管家/，卸载时提示用户
[Code]
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    if MsgBox('是否同时删除用户数据（数据库、配置等）？' + #13#10 +
              '数据位置: %APPDATA%\工程管家\' + #13#10 +
              '选择"是"将删除所有数据，选择"否"保留数据以便重新安装时恢复。',
              mbConfirmation, MB_YESNO) = IDYES then
    begin
      DelTree(ExpandConstant('{localappdata}\工程管家'), True, True, True);
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // 安装完成后记录版本号到配置目录
    SaveStringToFile(ExpandConstant('{localappdata}\工程管家\install-info.txt'),
      '版本: {#VERSION}' + #13#10 +
      '安装时间: ' + GetDateTimeString('yyyy-mm-dd hh:nn:ss', #0, #0) + #13#10 +
      '安装路径: {app}' + #13#10,
      False);
  end;
end;
