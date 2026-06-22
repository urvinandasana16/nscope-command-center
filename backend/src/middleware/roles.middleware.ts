import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { AppError } from "../utils/http";

const engineerRoles: UserRole[] = ["SUPER_ADMIN", "NOC_ENGINEER", "SUPPORT_ENGINEER"];

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) return next(new AppError(403, "Insufficient permissions"));
    return next();
  };
}

export function canAccessAllClients(role: UserRole) {
  return engineerRoles.includes(role);
}

export function getClientScope(req: Request) {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (canAccessAllClients(req.user.role)) return undefined;
  if (!req.user.clientId) throw new AppError(403, "Client user is not linked to a client");
  return req.user.clientId;
}
