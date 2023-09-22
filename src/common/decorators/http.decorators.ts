import type { PipeTransform } from "@nestjs/common";
import { Role } from "common/constants/role";
import { AdminGuard } from "common/guards/admin.guard";
import { OptionalJwtAuthGuard } from "common/guards/jwt-auth-optional.guard";
import { JwtAuthGuard } from "common/guards/jwt-auth.guard";
import { RolesGuard } from "common/guards/roles.guard";

import { applyDecorators, Param, ParseUUIDPipe, SetMetadata, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiUnauthorizedResponse } from "@nestjs/swagger";

import { AuthUserInterceptor } from "../interceptors/auth-user-interceptor.service";

import type { Type } from "@nestjs/common/interfaces";
export const ROLES_KEY = "roles";

export function Auth(...permission: Role[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    Permission(...permission),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    UseInterceptors(AuthUserInterceptor),
    ApiUnauthorizedResponse({ description: "Unauthorized" }),
  );
}

export function AuthAdmin(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AdminGuard),
    ApiBearerAuth(),
    UseInterceptors(AuthUserInterceptor),
    ApiUnauthorizedResponse({ description: "Unauthorized" }),
  );
}

export function AuthOptional(): MethodDecorator & ClassDecorator {
  return applyDecorators(UseGuards(OptionalJwtAuthGuard), ApiBearerAuth(), UseInterceptors(AuthUserInterceptor));
}

export function Permission(...permission: Role[]): MethodDecorator & ClassDecorator {
  return SetMetadata(ROLES_KEY, permission);
}

export function UUIDParam(property: string, ...pipes: Array<Type<PipeTransform> | PipeTransform>): ParameterDecorator {
  return Param(property, new ParseUUIDPipe({ version: "4" }), ...pipes);
}
