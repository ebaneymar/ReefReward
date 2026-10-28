#!/usr/bin/env python3
"""Create the ZIP and matching manifest together; no manual checksum copying."""
from pathlib import Path
import argparse,hashlib,json,re,zipfile,datetime
ROOT=Path(__file__).resolve().parent.parent
def main():
 p=argparse.ArgumentParser();p.add_argument('--version',required=True);p.add_argument('--repo',help='owner/repository');p.add_argument('--url',help='Exact HTTPS GitHub URL of the ZIP');p.add_argument('--output',type=Path,default=ROOT/'release');p.add_argument('--notes',type=Path);args=p.parse_args()
 if not re.fullmatch(r'(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})',args.version):p.error('Use a stable version such as 1.0.1')
 if args.repo and not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9_.-]{1,100}',args.repo):p.error('Repository must be owner/name')
 if bool(args.repo)==bool(args.url):p.error('Provide exactly one of --repo or --url')
 if args.url and not re.match(r'^https://(?:github\.com|raw\.githubusercontent\.com)/',args.url):p.error('Use an HTTPS GitHub download URL')
 notes=(args.notes.read_text().strip().splitlines() if args.notes else ['20 new 100-point limited fish with transparent art, fin animation, and elemental moves.','Noisy -2 and Standing -1 shortcuts; negative-score worm, plankton, and egg growth.','Preserves existing fish, points, rewards, Mystery Diver, and limited ownership.'])
 notes=[x.lstrip('- ').strip() for x in notes if x.strip()][:12]
 output=args.output.resolve();output.mkdir(parents=True,exist_ok=True);name=f'Reef_Rewards_Update_{args.version}.zip';archive=output/name
 meta={'app':'reef-rewards','format':1,'version':args.version,'minDesktopVersion':'1.0.0'}
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  z.write(ROOT/'app/game.html','game.html');z.writestr('release.json',json.dumps(meta,indent=2)+'\n')
 url=args.url or f'https://github.com/{args.repo}/releases/download/v{args.version}/{name}'
 manifest={**meta,'packageType':'reef-content','url':url,'sha256':hashlib.file_digest(archive.open('rb'),'sha256').hexdigest(),'size':archive.stat().st_size,'published':datetime.datetime.now(datetime.timezone.utc).isoformat(),'notes':notes}
 (output/'update-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 (output/'RELEASE_NOTES.txt').write_text('\n'.join('- '+x for x in notes)+'\n')
 print(json.dumps({'archive':str(archive),'manifest':str(output/'update-manifest.json'),'sha256':manifest['sha256'],'size':manifest['size']},indent=2))
if __name__=='__main__':main()
