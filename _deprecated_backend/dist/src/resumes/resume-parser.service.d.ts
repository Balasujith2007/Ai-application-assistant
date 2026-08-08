export declare class ResumeParserService {
    private readonly logger;
    extractText(filePath: string): Promise<string>;
    parseProfile(rawText: string): Promise<Record<string, unknown>>;
}
