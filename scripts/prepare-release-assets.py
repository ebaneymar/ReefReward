#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,shutil,zipfile
ROOT=Path(__file__).resolve().parent.parent
out=ROOT/'release';manifest=json.loads((out/'update-manifest.json').read_text());v=manifest['version'];exe=out/f'Reef_Rewards_{v}_Windows.exe'
if not exe.is_file():raise ValueError('The Windows app is missing')
stable=out/'Reef_Rewards_Windows.exe';shutil.copy2(exe,stable);shutil.copy2(ROOT/'app/game.html',out/'Reef_Rewards_Offline.html')
with zipfile.ZipFile(out/'Reef_Rewards_Windows.zip','w',zipfile.ZIP_STORED) as z:
 z.write(stable,stable.name);z.writestr('Read_Me.txt',f'Reef Rewards {v}\n\nExtract the ZIP and open Reef_Rewards_Windows.exe. Close any older Reef Rewards window first.\n\nYour existing EXE class stays saved on this computer. The Update game button is visible in the header and fullscreen tank. The game checks for updates when it starts. Click Update game, then Install update & restart when a new version is available.\n\nProgress autosaves. Use Settings > Export backup for an extra JSON copy. Use Restore backup to recover it or move to another computer. Moving from an HTML file? Export from the old HTML and restore once in the Windows game.\n\nThis Windows package is unsigned. Game, updater and package checks run before publication; Windows launch is not exercised by this Linux build.\n')
names=['Reef_Rewards_Windows.exe','Reef_Rewards_Windows.zip','Reef_Rewards_Offline.html',f'Reef_Rewards_Update_{v}.zip','update-manifest.json']
(out/'SHA256SUMS.txt').write_text(''.join(hashlib.file_digest((out/name).open('rb'),'sha256').hexdigest()+'  '+name+'\n' for name in names))
print('Prepared verified release assets for',v)
