import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            createdAt: Date;
        };
        token: string;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            googleId: string | null;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            createdAt: Date;
            updatedAt: Date;
        };
        token: string;
    }>;
    me(req: Express.Request & {
        user: {
            id: string;
        };
    }): Promise<{
        id: string;
        email: string;
        name: string;
        role: import("@prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
        profile: {
            id: string;
            phone: string | null;
            department: string | null;
            year: number | null;
            section: string | null;
            college: string | null;
            location: string | null;
            careerObjective: string | null;
            linkedinUrl: string | null;
            githubUrl: string | null;
            portfolioUrl: string | null;
        } | null;
    } | null>;
    googleLogin(): void;
    googleLoginCallback(req: any, res: any): void;
}
