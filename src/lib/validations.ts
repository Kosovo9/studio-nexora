import { z } from 'zod';

// Image upload validation
export const imageUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type),
      'File must be a valid image (JPEG, PNG, or WebP)'
    ),
  imageType: z.enum(['person', 'person-pet']),
  consent: z.boolean().refine((val) => val === true, 'You must accept the terms'),
});

// Process image validation
export const processImageSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  imageType: z.enum(['person', 'person-pet']),
  userId: z.string().optional(),
});

// Payment validation
export const paymentSchema = z.object({
  plan: z.enum(['basic', 'pro', 'vip']),
  email: z.string().email('Invalid email address'),
  userId: z.string().optional(),
});

// User registration validation
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// User login validation
export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Update profile validation
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  image: z.string().url('Invalid image URL').optional(),
});

// Contact form validation
export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

// Webhook validation
export const webhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

// API key validation
export const apiKeySchema = z.object({
  key: z.string().min(32, 'Invalid API key'),
});

// Rate limit validation
export const rateLimitSchema = z.object({
  identifier: z.string(),
  limit: z.number().positive(),
  window: z.number().positive(),
});

// Image metadata validation
export const imageMetadataSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  format: z.string(),
  size: z.number().positive(),
  processingTime: z.number().positive().optional(),
});

// Subscription validation
export const subscriptionSchema = z.object({
  plan: z.enum(['basic', 'pro', 'vip']),
  interval: z.enum(['month', 'year']),
  userId: z.string(),
});

// Analytics event validation
export const analyticsEventSchema = z.object({
  event: z.string(),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Export types
export type ImageUploadInput = z.infer<typeof imageUploadSchema>;
export type ProcessImageInput = z.infer<typeof processImageSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
export type ApiKeyInput = z.infer<typeof apiKeySchema>;
export type RateLimitInput = z.infer<typeof rateLimitSchema>;
export type ImageMetadataInput = z.infer<typeof imageMetadataSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
