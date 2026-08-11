const sharp = require('sharp');
sharp('src/assets/images/ipmlogowelcomescreen.png')
  .resize(400)
  .png({ compressionLevel: 9 })
  .toFile('src/assets/images/ipmlogowelcomescreen_compressed.png', (err, info) => {
    if (err) console.error(err);
    else console.log('Done:', info);
  });