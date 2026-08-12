Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Always run relative to this script's own folder, regardless of how/where
' Windows invokes it (Startup folder, a shortcut, double-click, etc.)
scriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

WshShell.Run "node server.js", 0, False