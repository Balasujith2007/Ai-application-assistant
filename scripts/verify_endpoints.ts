import prisma from '../lib/prisma';
import { signToken } from '../lib/serverAuth';

async function main() {
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    include: { profile: true }
  });
  const mentor = await prisma.user.findFirst({
    where: { role: 'MENTOR' },
    include: { profile: true }
  });
  const hod = await prisma.user.findFirst({
    where: { role: 'HOD' },
    include: { profile: true }
  });

  console.log('Student:', student?.email, student?.id);
  console.log('Mentor:', mentor?.email, mentor?.id);
  console.log('HOD:', hod?.email, hod?.id);

  if (student) {
    const sToken = signToken({ id: student.id, email: student.email, role: student.role });
    const res1 = await fetch('http://localhost:3000/api/dashboard/student', { headers: { Authorization: `Bearer ${sToken}` } });
    const res2 = await fetch('http://localhost:3000/api/leaderboard?periodType=ALL_TIME', { headers: { Authorization: `Bearer ${sToken}` } });
    const res3 = await fetch('http://localhost:3000/api/opportunities', { headers: { Authorization: `Bearer ${sToken}` } });
    const res4 = await fetch('http://localhost:3000/api/notifications', { headers: { Authorization: `Bearer ${sToken}` } });
    const res5 = await fetch('http://localhost:3000/api/check-in', { headers: { Authorization: `Bearer ${sToken}` } });
    console.log('Student endpoints:', {
      dashboard: res1.status,
      leaderboard: res2.status,
      opportunities: res3.status,
      notifications: res4.status,
      checkIn: res5.status,
    });
  }

  if (mentor) {
    const mToken = signToken({ id: mentor.id, email: mentor.email, role: mentor.role });
    const resM = await fetch('http://localhost:3000/api/mentor/dashboard', { headers: { Authorization: `Bearer ${mToken}` } });
    console.log('Mentor dashboard:', resM.status);
  }

  if (hod) {
    const hToken = signToken({ id: hod.id, email: hod.email, role: hod.role });
    const resH = await fetch('http://localhost:3000/api/hod/dashboard', { headers: { Authorization: `Bearer ${hToken}` } });
    console.log('HOD dashboard:', resH.status);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
