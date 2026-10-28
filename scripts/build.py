#!/usr/bin/env python3
"""Reproducible Windows portable layout, using an official checksum-pinned runtime."""
from pathlib import Path
import argparse,hashlib,json,shutil,urllib.request,zipfile,re
ROOT=Path(__file__).resolve().parent.parent
ELECTRON='45.0.0'
ARCHIVE=f'electron-v{ELECTRON}-win32-x64.zip'
EXPECTED='ae53887a23bb640369c93dbd38c408a2af5c0deb86f2fa76c6c244cb444b7f47'
def main():
 p=argparse.ArgumentParser();p.add_argument('--runtime',type=Path);p.add_argument('--version',default=json.loads((ROOT/'app/release.json').read_text())['version']);args=p.parse_args()
 if not re.fullmatch(r'(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})',args.version):p.error('Use a stable version such as 1.0.1')
 archive=args.runtime or ROOT/'.cache'/ARCHIVE
 if not archive.exists():
  archive.parent.mkdir(parents=True,exist_ok=True)
  url=f'https://github.com/electron/electron/releases/download/v{ELECTRON}/{ARCHIVE}'
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ReefRewards-build'}),timeout=180) as src,archive.open('wb') as out:shutil.copyfileobj(src,out)
 if hashlib.file_digest(archive.open('rb'),'sha256').hexdigest()!=EXPECTED:raise RuntimeError('Official Electron checksum verification failed')
 destination=ROOT/'build/win-unpacked'
 if destination.exists():shutil.rmtree(destination)
 destination.mkdir(parents=True)
 with zipfile.ZipFile(archive) as z:
  for f in z.infolist():
   candidate=(destination/f.filename).resolve()
   if not candidate.is_relative_to(destination.resolve()):raise RuntimeError('Unsafe runtime archive entry')
  z.extractall(destination)
 (destination/'electron.exe').rename(destination/'ReefRewards.exe')
 if (destination/'electron_wer.dll').exists():(destination/'electron_wer.dll').rename(destination/'ReefRewards_wer.dll')
 appdir=destination/'resources/app';shutil.copytree(ROOT/'app',appdir)
 for name in ['package.json','release.json']:
  data=json.loads((appdir/name).read_text());data['version']=args.version;(appdir/name).write_text(json.dumps(data,indent=2)+'\n')
 # electron-builder reads the root package version for its portable launcher name.
 package=json.loads((ROOT/'package.json').read_text());package['version']=args.version;(ROOT/'package.json').write_text(json.dumps(package,indent=2)+'\n')
 print(f'Prepared Windows x64 v{args.version}: {destination}')
if __name__=='__main__':main()
