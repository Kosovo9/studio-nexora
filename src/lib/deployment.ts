/**
 * NEXORA DEPLOYMENT SYSTEM
 * Domain configuration and production freeze protocol
 */

import { z } from 'zod';

export const DeploymentConfigSchema = z.object({
  domain: z.string().default('nexorapro.lat'),
  stagingSub: z.string().default('staging'),
  vercelProject: z.string().default('studio-nexora'),
  teamScope: z.string().default('neils-projects-8becf3f7'),
  goLiveFlag: z.enum(['YES', 'NO']).default('NO'),
  goLivePhrase: z.string().default('NEIL_CONFIRMED_CUTOVER'),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

export interface DeploymentInfo {
  apex: string;
  www: string;
  staging: string;
  productionUrl?: string;
  aliases: string[];
  status: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | 'FROZEN';
  lastDeployment?: Date;
}

export interface DeploymentLog {
  id: string;
  timestamp: Date;
  action: string;
  environment: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  details: any;
  user?: string;
}

export class NexoraDeployment {
  private static instance: NexoraDeployment;
  private config: DeploymentConfig;
  private deploymentLogs: DeploymentLog[] = [];
  private productionFrozen: boolean = true;

  private constructor() {
    this.config = {
      domain: 'nexorapro.lat',
      stagingSub: 'staging',
      vercelProject: 'studio-nexora',
      teamScope: 'neils-projects-8becf3f7',
      goLiveFlag: 'NO',
      goLivePhrase: 'NEIL_CONFIRMED_CUTOVER',
    };
  }

  public static getInstance(): NexoraDeployment {
    if (!NexoraDeployment.instance) {
      NexoraDeployment.instance = new NexoraDeployment();
    }
    return NexoraDeployment.instance;
  }

  public getDeploymentInfo(): DeploymentInfo {
    const { domain, stagingSub } = this.config;
    
    return {
      apex: domain,
      www: `www.${domain}`,
      staging: `${stagingSub}.${domain}`,
      aliases: [
        domain,
        `www.${domain}`,
        `${stagingSub}.${domain}`,
      ],
      status: this.productionFrozen ? 'FROZEN' : 'DEVELOPMENT',
    };
  }

  public async validateGoLive(phrase: string): Promise<boolean> {
    const isValid = phrase === this.config.goLivePhrase;
    
    this.logDeploymentAction({
      action: 'GO_LIVE_VALIDATION',
      environment: 'PRODUCTION',
      status: isValid ? 'SUCCESS' : 'BLOCKED',
      details: { phrase, valid: isValid },
    });

    if (isValid) {
      this.config.goLiveFlag = 'YES';
      this.productionFrozen = false;
    }

    return isValid;
  }

  public async deployToStaging(): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      const stagingUrl = `https://${this.config.stagingSub}.${this.config.domain}`;
      
      // Simulate deployment process
      await this.simulateDeployment('staging');
      
      this.logDeploymentAction({
        action: 'DEPLOY_STAGING',
        environment: 'STAGING',
        status: 'SUCCESS',
        details: { url: stagingUrl },
      });

      return {
        success: true,
        url: stagingUrl,
      };
    } catch (error) {
      this.logDeploymentAction({
        action: 'DEPLOY_STAGING',
        environment: 'STAGING',
        status: 'FAILED',
        details: { error: error.message },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  public async deployToProduction(confirmationPhrase: string): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    // Check if production is frozen
    if (this.productionFrozen) {
      const error = 'Production deployment is frozen. Use go-live validation first.';
      
      this.logDeploymentAction({
        action: 'DEPLOY_PRODUCTION',
        environment: 'PRODUCTION',
        status: 'BLOCKED',
        details: { error, frozen: true },
      });

      return { success: false, error };
    }

    // Validate confirmation phrase
    if (confirmationPhrase !== this.config.goLivePhrase) {
      const error = 'Invalid confirmation phrase for production deployment.';
      
      this.logDeploymentAction({
        action: 'DEPLOY_PRODUCTION',
        environment: 'PRODUCTION',
        status: 'BLOCKED',
        details: { error, phrase: confirmationPhrase },
      });

      return { success: false, error };
    }

    try {
      const productionUrl = `https://${this.config.domain}`;
      
      // Simulate production deployment
      await this.simulateDeployment('production');
      
      this.logDeploymentAction({
        action: 'DEPLOY_PRODUCTION',
        environment: 'PRODUCTION',
        status: 'SUCCESS',
        details: { url: productionUrl },
      });

      return {
        success: true,
        url: productionUrl,
      };
    } catch (error) {
      this.logDeploymentAction({
        action: 'DEPLOY_PRODUCTION',
        environment: 'PRODUCTION',
        status: 'FAILED',
        details: { error: error.message },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  public getProductionAliases(): Promise<string[]> {
    // Simulate vercel ls command
    return Promise.resolve([
      this.config.domain,
      `www.${this.config.domain}`,
    ]);
  }

  public isProductionFrozen(): boolean {
    return this.productionFrozen;
  }

  public getDeploymentLogs(): DeploymentLog[] {
    return this.deploymentLogs.slice(-50); // Last 50 logs
  }

  public generateDeploymentScript(): string {
    const { domain, stagingSub, vercelProject, teamScope, goLivePhrase } = this.config;
    
    return `#!/bin/bash
# NEXORA DEPLOYMENT SCRIPT
# Generated: ${new Date().toISOString()}

# Domain Configuration
DOMAIN="${domain}"
STAGING_SUB="${stagingSub}"
APEX="$DOMAIN"
WWW="www.$DOMAIN"
STAGING="$STAGING_SUB.$DOMAIN"

# Vercel Configuration
VERCEL_PROJECT="${vercelProject}"
TEAM_SCOPE="${teamScope}"

# Security Configuration
GO_LIVE_FLAG="NO"
GO_LIVE_PHRASE="${goLivePhrase}"

# Functions
deploy_staging() {
    echo "Deploying to staging environment..."
    vercel --scope "$TEAM_SCOPE" --yes
    vercel alias --scope "$TEAM_SCOPE" "$STAGING"
}

deploy_production() {
    if [ "$GO_LIVE_FLAG" != "YES" ]; then
        echo "ERROR: Production deployment blocked. GO_LIVE_FLAG must be YES"
        exit 1
    fi
    
    read -p "Enter confirmation phrase: " phrase
    if [ "$phrase" != "$GO_LIVE_PHRASE" ]; then
        echo "ERROR: Invalid confirmation phrase"
        exit 1
    fi
    
    echo "Deploying to production..."
    vercel --prod --scope "$TEAM_SCOPE" --yes
}

check_aliases() {
    echo "Current production aliases:"
    vercel ls "$VERCEL_PROJECT" --scope "$TEAM_SCOPE" --prod
}

# Main execution
case "$1" in
    "staging")
        deploy_staging
        ;;
    "production")
        deploy_production
        ;;
    "check")
        check_aliases
        ;;
    *)
        echo "Usage: $0 {staging|production|check}"
        exit 1
        ;;
esac
`;
  }

  private async simulateDeployment(environment: string): Promise<void> {
    // Simulate deployment time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate potential failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error(`Deployment to ${environment} failed: Network timeout`);
    }
  }

  private logDeploymentAction(params: Omit<DeploymentLog, 'id' | 'timestamp'>): void {
    const log: DeploymentLog = {
      id: this.generateLogId(),
      timestamp: new Date(),
      ...params,
    };

    this.deploymentLogs.push(log);

    // Keep only last 1000 logs
    if (this.deploymentLogs.length > 1000) {
      this.deploymentLogs = this.deploymentLogs.slice(-1000);
    }
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const nexoraDeployment = NexoraDeployment.getInstance();

// Utility functions
export const getDeploymentInfo = () => nexoraDeployment.getDeploymentInfo();
export const validateGoLive = (phrase: string) => nexoraDeployment.validateGoLive(phrase);
export const deployToStaging = () => nexoraDeployment.deployToStaging();
export const deployToProduction = (phrase: string) => nexoraDeployment.deployToProduction(phrase);
export const isProductionFrozen = () => nexoraDeployment.isProductionFrozen();