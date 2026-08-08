export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}
export declare class AiService {
    private readonly logger;
    chat(messages: ChatMessage[]): Promise<{
        reply: string;
    }>;
}
