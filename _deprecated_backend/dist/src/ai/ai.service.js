"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const MOCK_RESPONSES = {
    default: 'I\'m your AI Career Assistant. I can help you with resume improvement, cover letter generation, interview preparation, and career advice. What would you like help with today?',
    resume: '📄 **Resume Tips**\n\nHere are some key improvements for your resume:\n\n1. **Quantify achievements** — Use numbers and metrics (e.g., "Improved app performance by 40%")\n2. **Action verbs** — Start each bullet with strong verbs: Developed, Designed, Led, Implemented\n3. **Tailor to each role** — Match keywords from the job description\n4. **Keep it concise** — 1 page for freshers, 2 pages max\n5. **Clean formatting** — Use consistent fonts and spacing\n\n*Phase 2 will include AI-powered resume analysis.*',
    cover: '✉️ **Cover Letter Structure**\n\nA strong cover letter has 3 parts:\n\n**Opening** — Hook the reader, mention the specific role\n**Body** — Connect your top 2-3 achievements to the role requirements\n**Closing** — Call to action, express enthusiasm\n\n*Phase 2 will generate personalized cover letters using your profile data.*',
    interview: '🎤 **Interview Preparation**\n\n**Common questions to prepare for:**\n- Tell me about yourself\n- Why do you want this role?\n- Describe a challenge you overcame\n- Where do you see yourself in 5 years?\n\n**Tip:** Use the STAR method (Situation, Task, Action, Result)\n\n*Phase 2 will provide role-specific interview coaching.*',
    skills: '🔍 **Skill Gap Analysis**\n\nTo analyze your skill gaps, I need access to your profile and target job descriptions.\n\n**Popular skills in demand right now:**\n- React.js / Next.js\n- Python / Data Science\n- Cloud (AWS/GCP/Azure)\n- System Design\n- Communication & Leadership\n\n*Phase 2 will provide personalized skill gap analysis based on your profile.*',
};
let AiService = AiService_1 = class AiService {
    logger = new common_1.Logger(AiService_1.name);
    async chat(messages) {
        this.logger.log('[MOCK] AI chat request received');
        const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
        let reply = MOCK_RESPONSES.default;
        if (lastMessage.includes('resume') || lastMessage.includes('cv')) {
            reply = MOCK_RESPONSES.resume;
        }
        else if (lastMessage.includes('cover letter') ||
            lastMessage.includes('cover')) {
            reply = MOCK_RESPONSES.cover;
        }
        else if (lastMessage.includes('interview') ||
            lastMessage.includes('hire')) {
            reply = MOCK_RESPONSES.interview;
        }
        else if (lastMessage.includes('skill') ||
            lastMessage.includes('gap') ||
            lastMessage.includes('learn')) {
            reply = MOCK_RESPONSES.skills;
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
        return { reply };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)()
], AiService);
//# sourceMappingURL=ai.service.js.map