// Demo catalog built from the product photos in /public/photos.
// Run with `npx prisma db seed` (or `node prisma/seed.mjs`). Safe to re-run:
// it replaces the demo seller's listings instead of duplicating them.
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

try {
  process.loadEnvFile();
} catch {
  // .env is optional when DATABASE_URL is set directly
}

const db = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL),
});

const DEMO_SELLER_PHONE = "+254700000001";
const DEMO_SELLER_NAME = "Trego Demo Store";

// Spread the demo listings around so the county filter has something to do.
const LOCATIONS = [
  { county: "Nairobi", area: "Westlands" },
  { county: "Nairobi", area: "CBD" },
  { county: "Mombasa", area: "Nyali" },
  { county: "Kiambu", area: "Thika" },
  { county: "Nakuru", area: "Town centre" },
  { county: "Kisumu", area: "Milimani" },
  { county: "Nairobi", area: "Kilimani" },
];

// Listed newest-first: array order is the order they appear on the site.
const LISTINGS = [
  {
    category: "PHONES",
    title: "Samsung Galaxy S26 Ultra, 512GB, Titanium Black",
    brand: "Samsung",
    model: "Galaxy S26 Ultra",
    storageGb: 512,
    conditionGrade: "LIKE_NEW",
    defectsDescription: "",
    price: 175000,
    photo: "S26U.jpg",
  },
  {
    category: "LAPTOPS",
    title: 'MacBook Air 13" M4, 16GB RAM, 256GB, Sky Blue',
    brand: "Apple",
    model: "MacBook Air 13 (M4)",
    storageGb: 256,
    conditionGrade: "LIKE_NEW",
    defectsDescription: "",
    price: 128000,
    photo: "Apple-MacBook-Air-hero.jpg",
  },
  {
    category: "PHONES",
    title: "Google Pixel 10 Pro Fold, 256GB, Moonstone",
    brand: "Google",
    model: "Pixel 10 Pro Fold",
    storageGb: 256,
    conditionGrade: "GOOD",
    defectsDescription:
      "Faint crease on the inner screen, normal for a foldable. Hinge is firm.",
    price: 165000,
    photo: "px10pf.jpg",
  },
  {
    category: "DESKTOPS",
    title: "White gaming PC: GeForce RTX, 32GB RAM, 1TB SSD, liquid cooled",
    brand: "Custom build",
    model: "Gaming PC",
    storageGb: 1000,
    conditionGrade: "GOOD",
    defectsDescription:
      "Light dust on the bottom intake filter. All fans and RGB working.",
    price: 240000,
    photo: "gaming pc.webp",
  },
  {
    category: "CAMERAS",
    title: "Sony Alpha a7 IV, body only",
    brand: "Sony",
    model: "Alpha a7 IV",
    storageGb: null,
    conditionGrade: "GOOD",
    defectsDescription:
      "Shutter count around 18,000. Minor wear on the grip rubber.",
    price: 215000,
    photo: "sony camera.webp",
  },
  {
    category: "MONITORS",
    title: 'Samsung Odyssey G7 27" curved, 1440p 240Hz',
    brand: "Samsung",
    model: "Odyssey G7",
    storageGb: null,
    conditionGrade: "GOOD",
    defectsDescription:
      "One stuck pixel near the bottom-left corner, not noticeable in normal use.",
    price: 52000,
    photo: "monitors.jpeg",
  },
  {
    category: "PHONES",
    title: "Google Pixel 9 Pro, 128GB, Hazel",
    brand: "Google",
    model: "Pixel 9 Pro",
    storageGb: 128,
    conditionGrade: "GOOD",
    defectsDescription: "Light scratches on the frame. Battery health 91%.",
    price: 82000,
    photo: "px9.jpg",
  },
  {
    category: "COMPONENTS",
    title: "WD Blue SN5100 2TB NVMe SSD (PCIe 4.0)",
    brand: "Western Digital",
    model: "WD Blue SN5100",
    storageGb: 2000,
    conditionGrade: "LIKE_NEW",
    defectsDescription: "Used as a secondary drive for 3 months. Health 100%.",
    price: 16500,
    photo: "ssd.webp",
  },
  {
    category: "PHONES",
    title: "Samsung Galaxy S25 Ultra, 256GB, Titanium Black",
    brand: "Samsung",
    model: "Galaxy S25 Ultra",
    storageGb: 256,
    conditionGrade: "GOOD",
    defectsDescription: "Small scuff on the bottom edge. S Pen included.",
    price: 118000,
    photo: "s25u.png",
  },
  {
    category: "PHONES",
    title: "Samsung Galaxy A55 5G, 256GB, Awesome Iceblue",
    brand: "Samsung",
    model: "Galaxy A55",
    storageGb: 256,
    conditionGrade: "GOOD",
    defectsDescription: "",
    price: 36000,
    photo: "A55.jpg",
  },
  {
    category: "PHONES",
    title: "Google Pixel 10, 128GB, Indigo",
    brand: "Google",
    model: "Pixel 10",
    storageGb: 128,
    conditionGrade: "LIKE_NEW",
    defectsDescription: "",
    price: 88000,
    photo: "px10.jpg",
  },
  {
    category: "PHONES",
    title: "Samsung Galaxy S25, 128GB",
    brand: "Samsung",
    model: "Galaxy S25",
    storageGb: 128,
    conditionGrade: "GOOD",
    defectsDescription: "Screen protector fitted since day one. Battery health 94%.",
    price: 74000,
    photo: "s25.avif",
  },
  {
    category: "LAPTOPS",
    title: 'MacBook Pro 14" M3 Pro, 18GB RAM, 512GB, Space Black',
    brand: "Apple",
    model: "MacBook Pro 14 (M3 Pro)",
    storageGb: 512,
    conditionGrade: "GOOD",
    defectsDescription:
      "Light wear on the bottom case. Battery cycle count 212.",
    price: 185000,
    photo: "macbook.webp",
  },
  {
    category: "PHONES",
    title: "Google Pixel 9a, 128GB, Iris",
    brand: "Google",
    model: "Pixel 9a",
    storageGb: 128,
    conditionGrade: "FAIR",
    defectsDescription:
      "Scratches on the back and a small dent on the frame. Everything works.",
    price: 38000,
    photo: "px9a.webp",
  },
  {
    category: "COMPONENTS",
    title: "TeamGroup T-Create Expert DDR5 32GB (2x16GB) kit",
    brand: "TeamGroup",
    model: "T-Create Expert DDR5",
    storageGb: 32,
    conditionGrade: "LIKE_NEW",
    defectsDescription: "Pulled from a working build after upgrading to 64GB.",
    price: 13500,
    photo: "ram photos.jpg",
  },
  {
    category: "PHONES",
    title: "Infinix Hot 60 Pro, 256GB, green",
    brand: "Infinix",
    model: "Hot 60 Pro",
    storageGb: 256,
    conditionGrade: "LIKE_NEW",
    defectsDescription: "",
    price: 24000,
    photo: "ifx.jpg",
  },
  {
    category: "PHONES",
    title: "Infinix Hot 10, 128GB, white",
    brand: "Infinix",
    model: "Hot 10",
    storageGb: 128,
    conditionGrade: "GOOD",
    defectsDescription: "Hairline scratch on the back, not visible with a case.",
    price: 15000,
    photo: "ifxh10.webp",
  },
  {
    category: "PHONES",
    title: "Infinix Smart 10, 64GB, black",
    brand: "Infinix",
    model: "Smart 10",
    storageGb: 64,
    conditionGrade: "GOOD",
    defectsDescription: "",
    price: 11500,
    photo: "infinix smart 10.jpeg",
  },
];

async function main() {
  // Nobody knows this password: the account only exists to own demo listings.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

  const user = await db.user.upsert({
    where: { phoneNumber: DEMO_SELLER_PHONE },
    update: { phoneVerifiedAt: new Date() },
    create: {
      phoneNumber: DEMO_SELLER_PHONE,
      phoneVerifiedAt: new Date(),
      displayName: DEMO_SELLER_NAME,
      passwordHash,
    },
  });

  const seller = await db.sellerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, businessName: DEMO_SELLER_NAME },
  });

  // Orders are financial records with no cascade delete, so clear the demo
  // store's test orders (and their reviews/disputes) before its listings.
  const demoOrders = { listing: { sellerId: seller.id } };
  await db.review.deleteMany({ where: { order: demoOrders } });
  await db.dispute.deleteMany({ where: { order: demoOrders } });
  await db.order.deleteMany({ where: demoOrders });
  await db.listing.deleteMany({ where: { sellerId: seller.id } });

  const now = Date.now();
  for (const [i, listing] of LISTINGS.entries()) {
    const { price, photo, ...fields } = listing;
    await db.listing.create({
      data: {
        ...fields,
        ...LOCATIONS[i % LOCATIONS.length],
        delivery: i % 3 === 0,
        sellerId: seller.id,
        priceMinorUnits: price * 100,
        status: "ACTIVE",
        // Stagger timestamps so "Recently listed" follows array order.
        createdAt: new Date(now - i * 60 * 60 * 1000),
        photos: { create: [{ url: `/photos/${photo}`, position: 0 }] },
      },
    });
  }

  console.log(`Seeded ${LISTINGS.length} demo listings for ${DEMO_SELLER_NAME}.`);
}

try {
  await main();
} finally {
  await db.$disconnect();
}
