import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUserPayload } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'super-secret-access-key',
    });
  }

  async validate(payload: JwtUserPayload): Promise<JwtUserPayload> {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}
