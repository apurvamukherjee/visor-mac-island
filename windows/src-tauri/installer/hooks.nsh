; Visor writes its sign-in start entry itself (src/prefs.rs), so the uninstaller has to take it
; away, or Windows keeps trying to start a program that's gone at every sign-in.
!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Visor"
!macroend
