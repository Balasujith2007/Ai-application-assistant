import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

const p = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
const u = await p.user.findFirst({
  where: { email: 'gowthammurugan1111@gmail.com' },
  select: { id: true, name: true, email: true },
});
console.log('USER', JSON.stringify(u));
if (u) {
  const resumes = await p.resume.findMany({
    where: { userId: u.id },
    orderBy: { uploadedAt: 'desc' },
  });
  console.log('RESUME_COUNT', resumes.length);
  for (const r of resumes) {
    const rel = r.fileUrl.startsWith('/') ? r.fileUrl.slice(1) : r.fileUrl;
    const full = path.join(process.cwd(), 'public', rel);
    console.log(
      JSON.stringify({
        id: r.id,
        isActive: r.isActive,
        originalName: r.originalName,
        fileUrl: r.fileUrl,
        onDisk: fs.existsSync(full),
        size: r.fileSize,
        uploadedAt: r.uploadedAt,
      }),
    );
  }
  const audits = await p.autofillAuditEvent.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { status: true, detail: true, fieldLabel: true, fieldKey: true, createdAt: true },
  });
  for (const a of audits) console.log('AUDIT', JSON.stringify(a));
}
await p.$disconnect();
