"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ResumeParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeParserService = void 0;
const common_1 = require("@nestjs/common");
let ResumeParserService = ResumeParserService_1 = class ResumeParserService {
    logger = new common_1.Logger(ResumeParserService_1.name);
    async extractText(filePath) {
        this.logger.log(`[STUB] extractText called for: ${filePath}`);
        return '';
    }
    async parseProfile(rawText) {
        this.logger.log('[STUB] parseProfile called — AI parsing not yet implemented');
        return {
            skills: [],
            education: [],
            experience: [],
            projects: [],
            summary: '',
        };
    }
};
exports.ResumeParserService = ResumeParserService;
exports.ResumeParserService = ResumeParserService = ResumeParserService_1 = __decorate([
    (0, common_1.Injectable)()
], ResumeParserService);
//# sourceMappingURL=resume-parser.service.js.map