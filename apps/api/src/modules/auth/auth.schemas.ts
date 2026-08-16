import { z } from 'zod';    

export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8,"Password must be at least 8 characters long"),
    name: z.string().min(1,"Name is required").max(100,"Name must be less than 100 characters"),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1,"Password is required"),
});