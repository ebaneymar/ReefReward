#!/usr/bin/env python3
"""Sync edits to app/game.html back into the reviewable repository source."""
from pathlib import Path
import base64,hashlib,json,re
ROOT=Path(__file__).resolve().parent.parent
def decompose():
 text=(ROOT/'app/game.html').read_text();folder=ROOT/'game-src';art=folder/'artwork';art.mkdir(parents=True,exist_ok=True);items=[];known={}
 def replace(match):
  uri=match[0]
  if uri in known:return known[uri]
  mime,data=uri[5:].split(';base64,',1);raw=base64.b64decode(data,validate=True);index=len(items);token=f'@@REEF_IMAGE_{index:03}@@';extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}.get(mime)
  if not extension:raise ValueError('Unsupported embedded artwork type: '+mime)
  name=f'artwork/{index:03}.{extension}';(folder/name).write_bytes(raw);items.append({'token':token,'path':name,'mime':mime,'sha256':hashlib.sha256(raw).hexdigest()});known[uri]=token;return token
 template=re.sub(r'data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+',replace,text)
 (folder/'game.template.html').write_text(template);(folder/'artwork.json').write_text(json.dumps(items,indent=2)+'\n')
 return items
if __name__=='__main__':print('Synced',len(decompose()),'original artwork files; generated HTML stays self-contained')
