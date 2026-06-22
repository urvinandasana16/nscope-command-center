import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/client";
import { env } from "../config/env";
import { loginSchema } from "../validators/common";
import { AppError } from "../utils/http";

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== "ACTIVE") {
    throw new AppError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "Invalid credentials");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = jwt.sign(
    { email: user.email, role: user.role, clientId: user.clientId },
    env.jwtSecret,
    { subject: user.id, expiresIn: "8h" }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
    },
  });
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw new AppError(401, "Authentication required");
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, clientId: true, status: true, lastLogin: true },
  });
  if (!user) throw new AppError(404, "User not found");
  return res.json(user);
}

export async function logout(_req: Request, res: Response) {
  return res.json({ message: "Logged out" });
}
