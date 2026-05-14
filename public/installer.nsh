; 通过 customInit 宏钩子设置默认安装路径（electron-builder 会在 .onInit 中调用此宏）
!macro customInit
  StrCpy $INSTDIR "D:\Program Files (x86)\engineering-manager"
!macroend
