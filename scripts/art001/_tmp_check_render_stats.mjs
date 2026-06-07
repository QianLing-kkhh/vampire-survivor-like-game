import fs from 'node:fs';
import { readPng } from './png_utils.mjs';

const skins = ['assassin_default','witch_default','priest_default','warrior_default'];
const files = ['walk_up_0.png','walk_down_0.png','walk_right_0.png','walk_left_0.png','walk_up_right_0.png','walk_down_right_0.png'];

function bounds(png, threshold = 0) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const a = png.pixels[(y * png.width + x) * 4 + 3];
      if (a > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count += 1;
      }
    }
  }

  if (count === 0) {
    return { count: 0 };
  }

  return {
    count,
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    ratio: Number((count / (png.width * png.height)).toFixed(4)),
    marginTop: minY,
    marginLeft: minX,
    marginBottom: png.height - 1 - maxY,
    marginRight: png.width - 1 - maxX,
  };
}

for (const skin of skins) {
  console.log(`\n${skin}`);
  for (const fileName of files) {
    const p = `public/assets/art001_render_tmp/player/${skin}/${fileName}`;
    if (!fs.existsSync(p)) {
      console.log(fileName, 'missing');
      continue;
    }
    const img = readPng(p);
    const b = bounds(img, 0);
    console.log(fileName, b);
  }
}
