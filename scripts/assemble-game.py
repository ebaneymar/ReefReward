#!/usr/bin/env python3
"""Embed repository artwork into the exact single-file offline game."""
from pathlib import Path
import base64,hashlib,json,re
ROOT=Path(__file__).resolve().parent.parent
def assemble():
 source=ROOT/'game-src';text=(source/'game.template.html').read_text()
 for item in json.loads((source/'artwork.json').read_text()):
  path=(source/item['path']).resolve()
  if not path.is_relative_to(source.resolve()):raise ValueError('Unsafe artwork path')
  raw=path.read_bytes()
  if hashlib.sha256(raw).hexdigest()!=item['sha256']:raise ValueError('Artwork checksum mismatch: '+item['path'])
  token=item['token']
  if token not in text:raise ValueError('Artwork token is missing: '+token)
  text=text.replace(token,'data:'+item['mime']+';base64,'+base64.b64encode(raw).decode())
 if re.search(r'@@REEF_IMAGE_\d+@@',text):raise ValueError('An image is not embedded')
 (ROOT/'app/game.html').write_text(text)
 return text
if __name__=='__main__':
 text=assemble();print('Assembled offline game:',len(text.encode()),'bytes')
