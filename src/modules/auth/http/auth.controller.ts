import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { SignupUseCase } from "../application/use-cases/signup.use-case";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SignupDto } from "../dtos/signup.dto";
import { PublicUserDto } from "../dtos/public-user.dto";
import { LoginResultDto } from "../dtos/login-result.dto";
import { LoginDto } from "../dtos/auth.dto";
import { LoginUseCase } from "../application/use-cases/login.usecase";
import type { Response } from "express";
import { AuthCookieGuard } from "../guards/auth-cookie.guard";
import { MeUseCase } from "../application/use-cases/me.usecase";
import { RefreshUseCase } from "../application/use-cases/refresh.use-case";

const isProd = process.env.NODE_ENV === 'production';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly signupUseCase: SignupUseCase, 
        private readonly loginUseCase: LoginUseCase,
        private readonly meUseCase: MeUseCase,
        private readonly refreshUseCase: RefreshUseCase,
    ) {}

    @Post('login')
    @ApiOperation({ summary: 'Login a user (no authentication required)' })
    @ApiResponse({ status: 200, description: 'User logged in successfully', type: LoginResultDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() data: LoginDto, @Res({ passthrough: true }) res: Response): Promise<LoginResultDto> {
        const result = await this.loginUseCase.execute(data);

        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: isProd ? true : false,
            sameSite: 'lax',
            path: '/',
            partitioned: isProd ? true : false,
            maxAge: 1000 * 60 * 60 * 3, // 3 horas
        });

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: isProd ? true : false,
            sameSite: 'lax',
            path: '/',
            partitioned: isProd ? true : false,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
        });

        return result;
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token using refresh cookie (no authentication required)' })
    @ApiResponse({ status: 200, description: 'Tokens refreshed', type: LoginResultDto })
    @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<LoginResultDto> {
        const result = await this.refreshUseCase.execute(req as any);

        // Sempre rotacione os cookies ao fazer refresh
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: isProd ? true : false,
            sameSite: 'lax',
            path: '/',
            partitioned: isProd ? true : false,
            maxAge: 1000 * 60 * 60 * 3,
        });

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: isProd ? true : false,
            sameSite: 'lax',
            path: '/',
            partitioned: isProd ? true : false,
            maxAge: 1000 * 60 * 60 * 24 * 7,
        });

        return result;
    }

    @Post('signup')
    @ApiOperation({ summary: 'Signup a new user (no authentication required)' })
    @ApiResponse({ status: 201, description: 'User created successfully', type: PublicUserDto })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    async signup(@Body() data: SignupDto): Promise<PublicUserDto> {
        return this.signupUseCase.execute(data);
    }

    @Get('me')
    @ApiOperation({ summary: 'Get the current user (requires authentication)' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully', type: PublicUserDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @UseGuards(AuthCookieGuard)
    async me(@Req() req: Request): Promise<PublicUserDto> {
        return this.meUseCase.execute((req as any).user.sub);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout a user (requires authentication)' })
    @ApiResponse({ status: 200, description: 'User logged out successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @UseGuards(AuthCookieGuard)
    async logout(@Res({ passthrough: true }) res: Response): Promise<void> {
        
        const base = {
            httpOnly: true,
            secure: isProd,
            sameSite: (isProd ? 'none' : 'lax') as 'lax' | 'strict' | 'none',
            partitioned: isProd ? true : false,
            path: '/',
        };

        res.clearCookie('accessToken', base);
        res.clearCookie('refreshToken', base);
        return;
    }
}