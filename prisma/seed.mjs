import { hash } from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

if (process.env.NODE_ENV === "production") process.exit(0);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const accounts = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Nina Label", email: "admin@example.local", role: "ADMIN" },
  { id: "10000000-0000-4000-8000-000000000002", name: "Morgan Reed", email: "manager@example.local", role: "MANAGER" },
  { id: "10000000-0000-4000-8000-000000000003", name: "Alex Morgan", email: "user@example.local", role: "USER" },
];
const passwordHash = await hash("Nynety-Local-2026!", { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });

try {
  const users = new Map();
  for (const input of accounts) {
    const user = await prisma.user.upsert({ where: { email: input.email }, create: { ...input, emailVerified: true }, update: { role: input.role } });
    users.set(input.email, user);
    await prisma.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
      create: { userId: user.id, accountId: user.id, providerId: "credential", password: passwordHash },
      update: {},
    });
  }

  const user = users.get("user@example.local");
  const artistNames = ["Mira Sol", "Noah Vale", "Juniper"];
  const artists = new Map();
  for (const name of artistNames) {
    const artist = await prisma.artist.upsert({ where: { userId_name: { userId: user.id, name } }, create: { userId: user.id, name }, update: {} });
    artists.set(name, artist);
  }

  const samples = [
    { id: "20000000-0000-4000-8000-000000000001", title: "Blue Hour", type: "EP", status: "SUBMITTED", artist: "Mira Sol", date: "2026-10-18", tracks: ["Still Blue", "Late Light", "Tidepool"] },
    { id: "20000000-0000-4000-8000-000000000002", title: "Soft Focus", type: "SINGLE", status: "DRAFT", artist: "Noah Vale", date: "2026-11-02", tracks: ["Soft Focus"] },
    { id: "20000000-0000-4000-8000-000000000003", title: "Afterimage", type: "ALBUM", status: "CHANGES_REQUESTED", artist: "Mira Sol", date: "2026-10-24", tracks: ["Afterimage", "Somewhere In Between", "Static Bloom"] },
    { id: "20000000-0000-4000-8000-000000000004", title: "Night Swim", type: "SINGLE", status: "APPROVED", artist: "Juniper", date: "2026-12-12", tracks: ["Night Swim"] },
  ];
  for (const item of samples) {
    const release = await prisma.release.upsert({
      where: { id: item.id },
      create: { id: item.id, ownerId: user.id, createdBy: user.id, title: item.title, type: item.type, status: item.status, genre: "Alternative pop", language: "English", desiredDate: new Date(`${item.date}T12:00:00.000Z`) },
      update: {},
    });
    await prisma.releaseArtist.upsert({ where: { releaseId_artistId_role: { releaseId: release.id, artistId: artists.get(item.artist).id, role: "PRIMARY" } }, create: { releaseId: release.id, artistId: artists.get(item.artist).id, role: "PRIMARY" }, update: {} });
    if (await prisma.track.count({ where: { releaseId: release.id } }) === 0) {
      await prisma.track.createMany({ data: item.tracks.map((title, index) => ({ releaseId: release.id, title, trackNumber: index + 1 })) });
    }
    if (await prisma.releaseStatusHistory.count({ where: { releaseId: release.id } }) === 0) {
      await prisma.releaseStatusHistory.create({ data: { releaseId: release.id, actorId: user.id, toStatus: item.status } });
    }
  }
  console.info("Development seed complete. Accounts: admin, manager, user.");
} finally {
  await prisma.$disconnect();
}
