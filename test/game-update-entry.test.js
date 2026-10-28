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
