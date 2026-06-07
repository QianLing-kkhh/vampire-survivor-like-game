import fs from 'node:fs';
import { readPng } from './png_utils.mjs';
const skins=['assassin_default','witch_default','priest_default','warrior_default'];
const files=['walk_up_0.png','walk_down_0.png'];
function rowStats(png, row){let cnt=0;let max=0;let sum=0;for(let x=0;x<png.width;x++){const a=png.pixels[(row*png.width+x)*4+3];if(a>0){cnt++;sum+=a; if(a>max)max=a;}}return {cnt,max,avg:cnt?+(sum/cnt).toFixed(1):0};}
function colStats(png,col){let cnt=0;let max=0;let sum=0;for(let y=0;y<png.height;y++){const a=png.pixels[(y*png.width+col)*4+3];if(a>0){cnt++;sum+=a; if(a>max)max=a;}}return {cnt,max,avg:cnt?+(sum/cnt).toFixed(1):0};}
for(const s of skins){console.log(`\n${s}`);for(const f of files){const p=`public/assets/art001_render_tmp/player/${s}/${f}`;if(!fs.existsSync(p)){console.log('missing',f);continue;} const img=readPng(p); console.log(f,{width:img.width,height:img.height});for(const th of [1,16,32,64,96,128]){const rows=[];for(let y=0;y<img.height;y++){const cnt=(()=>{let c=0;for(let x=0;x<img.width;x++){if(img.pixels[(y*img.width+x)*4+3]>th)c++;}return c;})();if(cnt>0)rows.push({y,cnt});}const top=rows.length?rows[0].y:null;const bot=rows.length?rows[rows.length-1].y:null;const r0=rowStats(img,0),r79=rowStats(img,79);const c0=colStats(img,0),c79=colStats(img,79);const top1=rowStats(img,0).cnt,bot1=rowStats(img,79).cnt;console.log(`th=${th}`,{top,bottom:bot,row0:r0,row79:r79,col0:c0,col79:c79});}
}}
