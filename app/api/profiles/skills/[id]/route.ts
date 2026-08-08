import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/serverAuth';


export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const id = (await props.params).id;
    let profile = await prisma.profile.findUnique({ where: { userId } });
    if (profile) {
      await prisma.profileSkill.delete({
        where: { profileId_skillId: { profileId: profile.id, skillId: id } },
      });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) { return NextResponse.json({ message: 'Error' }, { status: 500 }); }
}

