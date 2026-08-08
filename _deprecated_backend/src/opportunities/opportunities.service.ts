import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommended(userId: string) {
    // In a real scenario, this would use the user's profile to match skills, CGPA, etc.
    // For now, we will just return all opportunities.
    const opportunities = await this.prisma.opportunity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Mock match score for demonstration
    return opportunities.map((opp) => ({
      ...opp,
      matchScore: Math.floor(Math.random() * 20) + 80, // Random score between 80 and 99
    }));
  }
}
