import { InterviewType } from '@prisma/client';
export declare class CreateInterviewDto {
    companyName: string;
    role: string;
    type?: InterviewType;
    date: string;
    time?: string;
    location?: string;
    prepTopics?: string[];
}
