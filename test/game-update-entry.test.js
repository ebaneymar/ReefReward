'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{newGame}=require('./game-fixture');
async function game(){const g=newGame();await g.run('autosaveReady');return g;}
test('Visible game update entry opens the desktop updater once and keeps progress unchanged',async()=>{
 const g=await game(),before=g.json('state');
 g.run('var opens=0;window.reefDesktop={isDesktop:true,openUpdates:async()=>{opens++}}');
 await g.run("action({dataset:{action:'gameUpdates'}})");assert.equal(g.run('opens'),1);assert.deepEqual(g.json('state'),before);
});
test('The fullscreen update entry exits the aquarium before opening updates',async()=>{
 const g=await game();g.run("var order=[];aquariumFullscreen=true;toggleAquariumFullscreen=async()=>{order.push('exit');aquariumFullscreen=false};window.reefDesktop={isDesktop:true,openUpdates:async()=>{order.push('open')}}");
 await g.run("action({dataset:{action:'gameUpdates'}})");assert.deepEqual(g.json('order'),['exit','open']);
});
test('A new release marks both update buttons, while HTML play provides the correct desktop download',async()=>{
 const g=await game();g.run("setGameUpdateReady('1.1.2')");
 assert.equal(g.node('gameUpdateButton').textContent,'↻ Update ready');assert.equal(g.node('tankUpdateButton').attrs['data-update-state'],'available');
 await g.run("action({dataset:{action:'gameUpdates'}})");assert.ok(g.node('dialog').innerHTML.includes('https://github.com/ebaneymar/ReefReward/releases/latest'));assert.equal(g.node('dialog').open,true);
});
test('Settings opens the same desktop updater without changing the class or unsaved settings',async()=>{
 const g=await game(),before=g.json('state');
 await g.run("action({dataset:{action:'settings'}})");
 assert.ok(g.node('dialog').innerHTML.includes('id="settingsUpdateButton"'));
 assert.ok(g.node('dialog').innerHTML.includes('Game updates'));
 g.node('settingsTitle').value='Unsaved class title';
 g.run('var opens=0;window.reefDesktop={isDesktop:true,openUpdates:async()=>{opens++}}');
 await g.run("action({dataset:{action:'gameUpdates'}})");
 assert.equal(g.run('opens'),1);assert.equal(g.node('dialog').open,true);
 assert.equal(g.node('settingsTitle').value,'Unsaved class title');
 assert.deepEqual(g.json('state'),before);
});
test('An update found before Settings opens remains visible when Settings is reopened',async()=>{
 const g=await game();g.run("setGameUpdateReady('1.1.3')");
 await g.run("action({dataset:{action:'settings'}})");
 assert.ok(g.node('dialog').innerHTML.includes('Version 1.1.3 is ready to install.'));
 assert.ok(g.node('dialog').innerHTML.includes('data-update-state="available"'));
 g.run("setGameUpdateReady('1.1.4')");
 assert.equal(g.node('settingsUpdateMessage').textContent,'Version 1.1.4 is ready to install.');
 assert.equal(g.node('settingsUpdateButton').attrs['aria-label'],'Update game: version 1.1.4 available');
 g.run("preview.close()");await g.run("action({dataset:{action:'settings'}})");
 assert.ok(g.node('dialog').innerHTML.includes('Version 1.1.4 is ready to install.'));
});
