import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUserPayload } from '../../../common/decorators/current-user.decorator.js';
import { getJwtAccessSecret } from '../../../common/security/jwt-access-secret.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtAccessSecret(),
    });
  }

  async validate(payload: JwtUserPayload): Promise<JwtUserPayload> {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}
