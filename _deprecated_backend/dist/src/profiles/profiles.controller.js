"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilesController = void 0;
const common_1 = require("@nestjs/common");
const profiles_service_1 = require("./profiles.service");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const education_dto_1 = require("./dto/education.dto");
const project_dto_1 = require("./dto/project.dto");
const experience_dto_1 = require("./dto/experience.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ProfilesController = class ProfilesController {
    profilesService;
    constructor(profilesService) {
        this.profilesService = profilesService;
    }
    getMyProfile(req) {
        return this.profilesService.getMyProfile(req.user.id);
    }
    updateProfile(req, dto) {
        return this.profilesService.updateProfile(req.user.id, dto);
    }
    addEducation(req, dto) {
        return this.profilesService.addEducation(req.user.id, dto);
    }
    updateEducation(req, id, dto) {
        return this.profilesService.updateEducation(req.user.id, id, dto);
    }
    deleteEducation(req, id) {
        return this.profilesService.deleteEducation(req.user.id, id);
    }
    addSkill(req, body) {
        return this.profilesService.addSkill(req.user.id, body.name);
    }
    removeSkill(req, skillId) {
        return this.profilesService.removeSkill(req.user.id, skillId);
    }
    addProject(req, dto) {
        return this.profilesService.addProject(req.user.id, dto);
    }
    updateProject(req, id, dto) {
        return this.profilesService.updateProject(req.user.id, id, dto);
    }
    deleteProject(req, id) {
        return this.profilesService.deleteProject(req.user.id, id);
    }
    addExperience(req, dto) {
        return this.profilesService.addExperience(req.user.id, dto);
    }
    updateExperience(req, id, dto) {
        return this.profilesService.updateExperience(req.user.id, id, dto);
    }
    deleteExperience(req, id) {
        return this.profilesService.deleteExperience(req.user.id, id);
    }
};
exports.ProfilesController = ProfilesController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Put)('me'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('education'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, education_dto_1.CreateEducationDto]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "addEducation", null);
__decorate([
    (0, common_1.Put)('education/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, education_dto_1.UpdateEducationDto]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "updateEducation", null);
__decorate([
    (0, common_1.Delete)('education/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "deleteEducation", null);
__decorate([
    (0, common_1.Post)('skills'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "addSkill", null);
__decorate([
    (0, common_1.Delete)('skills/:skillId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('skillId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "removeSkill", null);
__decorate([
    (0, common_1.Post)('projects'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, project_dto_1.CreateProjectDto]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "addProject", null);
__decorate([
    (0, common_1.Put)('projects/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, project_dto_1.UpdateProjectDto]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "updateProject", null);
__decorate([
    (0, common_1.Delete)('projects/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "deleteProject", null);
__decorate([
    (0, common_1.Post)('experience'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, experience_dto_1.CreateExperienceDto]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "addExperience", null);
__decorate([
    (0, common_1.Put)('experience/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, experience_dto_1.UpdateExperienceDto]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "updateExperience", null);
__decorate([
    (0, common_1.Delete)('experience/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ProfilesController.prototype, "deleteExperience", null);
exports.ProfilesController = ProfilesController = __decorate([
    (0, common_1.Controller)('profiles'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [profiles_service_1.ProfilesService])
], ProfilesController);
//# sourceMappingURL=profiles.controller.js.map