// Battlora — esports artwork generator
// Generates hero banner, 4 tournament banners, CTA + auth backgrounds
// Style: dark navy/black base, orange ember accents (#FF7A1C), no text (avoids AI text artifacts)
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUT_DIR = "/home/z/my-project/public/images";

const STYLE =
  "premium esports poster art, digital painting, cinematic lighting, dark navy-black color palette with glowing orange ember accents, highly detailed, dramatic atmosphere, no text, no words, no letters, no logos, no watermark";

const IMAGES = [
  {
    file: "hero-bg.png",
    size: "1440x736",
    prompt:
      "Atmospheric wide battlefield scene at dusk: three tactical soldiers in modern combat gear standing on a rocky ridge seen from behind at three-quarter angle, holding assault rifles, looking out over a dark smoky valley, glowing orange embers and sparks rising, distant fires on the horizon, deep navy storm clouds, strong orange rim lighting on the characters, wide cinematic composition with the squad positioned on the right third and open dark empty sky on the left side for headline overlay, completely textless artwork, absolutely no text, no captions, no titles, no typography, no letters, no numbers, no watermark, " + STYLE,
  },
  {
    file: "banner-pro-series.png",
    size: "1440x736",
    prompt:
      "Intense esports battle scene: two battle royale soldiers in tactical gear sprinting through flames and sparks during a firefight, dynamic diagonal action composition, orange fire glow illuminating dark battlefield debris, dust particles, " + STYLE,
  },
  {
    file: "banner-weekend-clash.png",
    size: "1440x736",
    prompt:
      "Night raid battle royale scene: squad of soldiers parachuting from a military plane over a tropical island city at night, neon orange city lights below, dark blue moonlit atmosphere, glowing flare trails, aerial cinematic composition, " + STYLE,
  },
  {
    file: "banner-community-cup.png",
    size: "1440x736",
    prompt:
      "Battle royale squad of four tactical soldiers standing shoulder to shoulder as a unified team on a hilltop, backlit by dramatic orange sunset sky, weapons held confidently, silhouetted heroic pose, camaraderie theme, " + STYLE,
  },
  {
    file: "banner-champions-league.png",
    size: "1440x736",
    prompt:
      "Championship victory scene: a large gleaming golden esports championship trophy cup centered on a dark reflective stage pedestal, dramatic orange spotlights beaming down from above, golden confetti and sparks raining, silhouettes of a cheering crowd in dark foreground, smooth empty dark stage walls with no signage of any kind, completely textless artwork, absolutely no text, no banners with writing, no captions, no typography, no letters, no numbers, no watermark, " + STYLE,
  },
  {
    file: "cta-bg.png",
    size: "1440x736",
    prompt:
      "Abstract esports background texture only, no characters: glowing orange embers and fire particles rising from bottom, subtle geometric hexagonal grid pattern fading into deep black-navy gradient, cinematic depth of field, wide composition, " + STYLE,
  },
  {
    file: "auth-bg.png",
    size: "1440x736",
    prompt:
      "Atmospheric battle royale landscape at night: lone soldier silhouette with rifle standing on a cliff overlooking a dark battlefield valley, distant orange glow and smoke on the horizon, stars in deep navy sky, minimal moody composition with large dark negative space in the center, " + STYLE,
  },
];

async function generateWithRetry(zai, spec, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await zai.images.generations.create({
        prompt: spec.prompt,
        size: spec.size,
      });
      const b64 = res?.data?.[0]?.base64;
      if (!b64) throw new Error("empty base64 payload");
      const buf = Buffer.from(b64, "base64");
      if (buf.length < 20000) throw new Error(`suspiciously small image (${buf.length} bytes)`);
      fs.writeFileSync(path.join(OUT_DIR, spec.file), buf);
      console.log(`OK  ${spec.file}  ${(buf.length / 1024).toFixed(0)} KB`);
      return true;
    } catch (err) {
      console.error(`FAIL ${spec.file} attempt ${attempt}: ${err.message}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return false;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const filter = process.argv[2]; // optional: regenerate only files containing this substring
  const targets = filter ? IMAGES.filter((i) => i.file.includes(filter)) : IMAGES;
  if (targets.length === 0) {
    console.error(`No image spec matches filter "${filter}"`);
    process.exit(1);
  }
  const zai = await ZAI.create();
  let ok = 0;
  for (const spec of targets) {
    if (await generateWithRetry(zai, spec)) ok++;
  }
  console.log(`\nGenerated ${ok}/${targets.length} images in ${OUT_DIR}`);
  if (ok < targets.length) process.exit(1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
