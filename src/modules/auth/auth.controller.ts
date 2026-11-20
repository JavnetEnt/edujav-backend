import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, JwtUserPayload } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, OnboardSchoolDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('onboard-school')
  onboardSchool(@Body() dto: OnboardSchoolDto) {
    return this.authService.onboardSchool(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@CurrentUser() user: JwtUserPayload) {
    return user;
  }

    @UseGuards(AuthGuard('jwt'))
  @Patch('change-password')
  changePassword(@CurrentUser() user: JwtUserPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }

}
