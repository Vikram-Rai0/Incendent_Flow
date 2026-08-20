

import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface AccessTokenPayload {
    userId: string;
    role: string;
    tokenVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: { userId: string; tokenVersion: number }) {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string; tokenVersion: number } {
    return jwt.verify(token, REFRESH_SECRET) as { userId: string; tokenVersion: number };
}