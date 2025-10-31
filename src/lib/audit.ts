import { prisma } from './prisma';

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  event: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Create audit log entry in database
    // This is a simplified implementation
    await prisma.$executeRaw`
      INSERT INTO "AuditLog" (event, metadata, "createdAt")
      VALUES (${event}, ${JSON.stringify(metadata)}, NOW())
      ON CONFLICT DO NOTHING
    `.catch(() => {
      // If table doesn't exist, just log to console
      console.log('Audit Log:', event, metadata);
    });
  } catch (error) {
    // Fallback to console logging if database fails
    console.log('Audit Log:', event, metadata);
  }
}

