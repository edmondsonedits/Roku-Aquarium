# One permanent Windows aquarium

1. Close the old aquarium command window.
2. Download the new ZIP and choose **Extract All** into a temporary folder.
3. Double-click **START-WINDOWS.bat** once. It checks and installs the ready-to-run application into `%USERPROFILE%\.work-aquarium-app\current`, then starts it.
4. Next time, run `%USERPROFILE%\.work-aquarium-app\START-AQUARIUM.bat`. You can copy that small BAT file to your Desktop; it always opens the permanent installation.

Your fish and backdrop remain in `%USERPROFILE%\.work-aquarium`, just as before. Nothing needs to move between versions and the video is not copied every update. A custom `AQUARIUM_DATA_DIR` must be a full absolute path outside the managed app folder; relative overrides stop with guidance rather than silently selecting a new save folder.

After the updated aquarium starts and your saved fish/background appear, delete the downloaded ZIP and temporary extracted folder. You may also delete old extracted application folders once you have confirmed they do not contain personal files. The installer does **not** hunt for or erase arbitrary folders or downloads. It automatically removes only its own verified previous application version after the server starts successfully. Keep the `.work-aquarium` saved-data folder.

## Failure safety

The download is checked against SHA-256 hashes before replacement. Files stage into a separate folder before activation; interrupted swaps restore the previous app on the next install. Corrupt/incomplete packages and unexpected installed files stop the update instead of deleting them. The old app remains available under `.work-aquarium-app\previous` if startup fails before listening. The app compatibility guard prevents an older server from silently changing newer-schema saves. These safeguards do not substitute for periodic backups of the saved-data folder.

If power fails during staging, an incomplete `staging-*` folder may remain inside `.work-aquarium-app`; it is deliberately not erased automatically without verification. If an update was interrupted and no update process remains, remove only the empty `.update-lock` folder before retrying. Do not remove `current`, `previous`, or your data folder as a troubleshooting shortcut.

No Internet download, GitHub login, npm installation, administrator access or firewall changes are performed by the updater. Node.js 24+ is still required. Normal runtime remains local.

## Verification limits

File staging, rollback, interrupted swap recovery, malformed downloads and preservation of unknown files are tested using disposable directories. Windows BAT execution, Windows filesystem locking, power loss on actual hardware and the real saved aquarium have not been tested here.
