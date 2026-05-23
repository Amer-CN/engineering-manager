Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Clear Vite deps cache to avoid electron+wasm stale bundle issues
If fso.FolderExists(scriptDir & "\node_modules\.vite") Then
    fso.DeleteFolder scriptDir & "\node_modules\.vite", True
End If

' Launch via Windows Terminal Preview
shell.Run "wt.exe -w -1 -d """ & scriptDir & """ cmd /c chcp 65001>nul && npm run dev", 1, False
