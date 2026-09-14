// Battlora — swap seeded tournament banners for generated esports artwork
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const BANNERS = [
  { slug: "battlora-pro-series-s1", banner: "/images/banner-pro-series.png" },
  { slug: "battlora-weekend-clash", banner: "/images/banner-weekend-clash.png" },
  { slug: "battlora-community-cup", banner: "/images/banner-community-cup.png" },
  { slug: "battlora-champions-league-2025", banner: "/images/banner-champions-league.png" },
];

async function main() {
  for (const { slug, banner } of BANNERS) {
    const t = await db.tournament.update({
      where: { slug },
      data: { bannerUrl: banner },
    });
    console.log(`OK  ${t.slug}  →  ${t.bannerUrl}`);
  }
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
