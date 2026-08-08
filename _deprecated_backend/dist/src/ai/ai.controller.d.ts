import { AiService, ChatMessage } from './ai.service';
declare class ChatDto {
    messages: ChatMessage[];
}
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    chat(dto: ChatDto): Promise<{
        reply: string;
    }>;
}
export {};
