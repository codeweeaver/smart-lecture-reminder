// Regenerates public/icons/*.png (and public/favicon.png) from src/assets/logo.png.
// Re-run this after replacing the source logo: node generate-icons.js
import { mkdirSync } from "fs";
import sharp from "sharp";

const SOURCE = "./src/assets/logo.png";
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const CANVAS = 512; // master canvas the logo is padded onto before downscaling
const PADDING_RATIO = 0.82; // keep the logo within ~82% of the canvas (maskable-safe margin)

mkdirSync("./public/icons", { recursive: true });

async function run() {
  const logoSize = Math.round(CANVAS * PADDING_RATIO);

  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: "contain", background: "#ffffff" })
    .toBuffer();

  const master = await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();

  for (const size of SIZES) {
    const path = `./public/icons/icon-${size}x${size}.png`;
    await sharp(master).resize(size, size).toFile(path);
    console.log(`Generated ${path}`);
  }

  await sharp(master).resize(32, 32).toFile("./public/favicon.png");
  console.log("Generated ./public/favicon.png");
}

run();
