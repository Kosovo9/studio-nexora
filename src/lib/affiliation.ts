/**
 * NEXORA AFFILIATION TRACKING SYSTEM
 * Advanced affiliate program with tracking and analytics
 */

import { z } from 'zod';

export const AffiliateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  code: z.string(),
  email: z.string().email(),
  name: z.string(),
  commissionRate: z.number().min(0).max(1),
  totalEarnings: z.number().default(0),
  totalReferrals: z.number().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ReferralSchema = z.object({
  id: z.string(),
  affiliateId: z.string(),
  referredUserId: z.string(),
  referralCode: z.string(),
  conversionValue: z.number(),
  commission: z.number(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PAID']),
  createdAt: z.date(),
  convertedAt: z.date().optional(),
});

export type Affiliate = z.infer<typeof AffiliateSchema>;
export type Referral = z.infer<typeof ReferralSchema>;

export class NexoraAffiliation {
  private static instance: NexoraAffiliation;
  private affiliates: Map<string, Affiliate> = new Map();
  private referrals: Map<string, Referral> = new Map();
  private tracking: Map<string, any> = new Map();

  private constructor() {
    this.initializeTracking();
  }

  public static getInstance(): NexoraAffiliation {
    if (!NexoraAffiliation.instance) {
      NexoraAffiliation.instance = new NexoraAffiliation();
    }
    return NexoraAffiliation.instance;
  }

  private initializeTracking(): void {
    // Track referral codes from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      this.trackReferral(refCode);
    }

    // Track from localStorage
    const storedRef = localStorage.getItem('nexora-referral');
    if (storedRef) {
      this.trackReferral(storedRef);
    }
  }

  public trackReferral(referralCode: string): void {
    // Store referral code for attribution
    localStorage.setItem('nexora-referral', referralCode);
    
    // Track in session
    this.tracking.set('currentReferral', {
      code: referralCode,
      timestamp: new Date(),
      source: 'url',
    });

    // Send tracking event
    this.sendTrackingEvent('referral_visit', {
      referralCode,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    });
  }

  public async createAffiliate(params: {
    userId: string;
    email: string;
    name: string;
    commissionRate?: number;
  }): Promise<Affiliate> {
    const affiliate: Affiliate = {
      id: this.generateId(),
      userId: params.userId,
      code: this.generateReferralCode(),
      email: params.email,
      name: params.name,
      commissionRate: params.commissionRate || 0.1, // 10% default
      totalEarnings: 0,
      totalReferrals: 0,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.affiliates.set(affiliate.id, affiliate);
    return affiliate;
  }

  public async processConversion(params: {
    userId: string;
    conversionValue: number;
    referralCode?: string;
  }): Promise<Referral | null> {
    const referralCode = params.referralCode || this.tracking.get('currentReferral')?.code;
    
    if (!referralCode) {
      return null;
    }

    const affiliate = this.getAffiliateByCode(referralCode);
    if (!affiliate) {
      return null;
    }

    const commission = params.conversionValue * affiliate.commissionRate;
    
    const referral: Referral = {
      id: this.generateId(),
      affiliateId: affiliate.id,
      referredUserId: params.userId,
      referralCode,
      conversionValue: params.conversionValue,
      commission,
      status: 'CONFIRMED',
      createdAt: new Date(),
      convertedAt: new Date(),
    };

    // Update affiliate stats
    affiliate.totalEarnings += commission;
    affiliate.totalReferrals += 1;
    affiliate.updatedAt = new Date();

    this.referrals.set(referral.id, referral);
    this.affiliates.set(affiliate.id, affiliate);

    // Clear tracking
    localStorage.removeItem('nexora-referral');
    this.tracking.delete('currentReferral');

    // Send conversion event
    this.sendTrackingEvent('conversion', {
      affiliateId: affiliate.id,
      referralId: referral.id,
      conversionValue: params.conversionValue,
      commission,
    });

    return referral;
  }

  public getAffiliateByCode(code: string): Affiliate | undefined {
    return Array.from(this.affiliates.values()).find(a => a.code === code);
  }

  public getAffiliateStats(affiliateId: string): {
    totalEarnings: number;
    totalReferrals: number;
    pendingCommissions: number;
    recentReferrals: Referral[];
  } {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const affiliateReferrals = Array.from(this.referrals.values())
      .filter(r => r.affiliateId === affiliateId);

    const pendingCommissions = affiliateReferrals
      .filter(r => r.status === 'PENDING')
      .reduce((sum, r) => sum + r.commission, 0);

    const recentReferrals = affiliateReferrals
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      totalEarnings: affiliate.totalEarnings,
      totalReferrals: affiliate.totalReferrals,
      pendingCommissions,
      recentReferrals,
    };
  }

  public generateReferralLink(affiliateCode: string, baseUrl?: string): string {
    const url = baseUrl || window.location.origin;
    return `${url}?ref=${affiliateCode}`;
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateId(): string {
    return `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendTrackingEvent(event: string, data: any): void {
    // Send to analytics service
    console.log('Tracking event:', event, data);
    
    // In production, this would send to your analytics service
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, timestamp: new Date() }),
    }).catch(console.error);
  }
}

// Export singleton instance
export const nexoraAffiliation = NexoraAffiliation.getInstance();

// Utility functions
export const trackReferral = (code: string) => nexoraAffiliation.trackReferral(code);
export const createAffiliate = (params: any) => nexoraAffiliation.createAffiliate(params);
export const processConversion = (params: any) => nexoraAffiliation.processConversion(params);
export const generateReferralLink = (code: string, baseUrl?: string) => 
  nexoraAffiliation.generateReferralLink(code, baseUrl);
