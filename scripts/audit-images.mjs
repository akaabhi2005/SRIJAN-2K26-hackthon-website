import sharp from 'sharp';
import fs from 'node:fs';
for(const name of fs.readdirSync('public/team').filter(n=>/\.(png|jpg)$/.test(n))) await sharp('public/team/'+name).resize(160,160,{fit:'cover'}).webp({quality:82}).toFile('public/team/'+name.replace(/\.(png|jpg)$/,'.webp'));
