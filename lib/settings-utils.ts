export interface SettingValue {
  key: string;
  value: any;
  type: string;
}

export interface DashboardMetrics {
  activeVillagers: number;
  monthlyContributions: number;
  cashOnHand: number;
  monthlyFixedCosts: number;
  cashDeployed: number;
}

export interface MarqueeConfig {
  contentType: "projects" | "metrics";
  featuredProjectsCount: number;
  selectedMetrics: string[];
}

import { getSetting } from "./actions/settings";

export interface SettingValue {
  key: string;
  value: any;
  type: string;
}

export interface DashboardMetrics {
  activeVillagers: number;
  monthlyContributions: number;
  cashOnHand: number;
  monthlyFixedCosts: number;
  cashDeployed: number;
}

export interface MarqueeConfig {
  contentType: "projects" | "metrics";
  featuredProjectsCount: number;
  selectedMetrics: string[];
}

// Helper function to get typed setting value with better error handling
export async function getTypedSetting<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const value = await getSetting(key);
    return value ?? defaultValue;
  } catch (error) {
    console.warn(`Failed to get setting ${key}, using default:`, error);
    return defaultValue;
  }
}

// Get dashboard metrics based on settings
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const dataSource = await getTypedSetting(
      "metrics_data_source",
      "calculated"
    );

    if (dataSource === "manual") {
      return {
        activeVillagers: await getTypedSetting("manual_active_villagers", 0),
        monthlyContributions: await getTypedSetting(
          "manual_monthly_contributions",
          0
        ),
        cashOnHand: await getTypedSetting("manual_cash_on_hand", 0),
        monthlyFixedCosts: await getTypedSetting(
          "monthly_operational_costs",
          0
        ),
        cashDeployed: await getTypedSetting("manual_cash_deployed", 0),
      };
    }

    // In real implementation, calculate from actual data
    // For now, return sample calculated values
    return {
      activeVillagers: 2006,
      monthlyContributions: 23590,
      cashOnHand: 7351,
      monthlyFixedCosts: 12102,
      cashDeployed: 221803,
    };
  } catch (error) {
    console.error("Error getting dashboard metrics:", error);
    // Return default values on error
    return {
      activeVillagers: 0,
      monthlyContributions: 0,
      cashOnHand: 0,
      monthlyFixedCosts: 0,
      cashDeployed: 0,
    };
  }
}

// Get marquee configuration
export async function getMarqueeConfig(): Promise<MarqueeConfig> {
  try {
    const contentType = (await getTypedSetting(
      "marquee_content_type",
      "projects"
    )) as "projects" | "metrics";
    const featuredProjectsCount = await getTypedSetting(
      "marquee_featured_projects_count",
      3
    );
    const selectedMetrics = await getTypedSetting("marquee_metrics_selection", [
      "active_villagers",
    ]);

    return {
      contentType,
      featuredProjectsCount,
      selectedMetrics,
    };
  } catch (error) {
    console.error("Error getting marquee config:", error);
    return {
      contentType: "projects",
      featuredProjectsCount: 3,
      selectedMetrics: ["active_villagers"],
    };
  }
}

// Get voting configuration
export async function getVotingConfig() {
  try {
    const minPledgeToVote = await getTypedSetting(
      "min_pledge_amount_to_vote",
      5.0
    );
    const eligibilityCriteria = await getTypedSetting(
      "voting_eligibility_criteria",
      "last_3_months"
    );

    return {
      minPledgeAmount: minPledgeToVote,
      eligibilityCriteria,
      getEligibilityDescription: () => {
        switch (eligibilityCriteria) {
          case "last_3_months":
            return "At least one transaction in the last 3 months";
          case "last_6_months":
            return "At least one transaction in the last 6 months";
          case "one_ever":
            return "At least one transaction ever";
          default:
            return eligibilityCriteria;
        }
      },
    };
  } catch (error) {
    console.error("Error getting voting config:", error);
    return {
      minPledgeAmount: 5.0,
      eligibilityCriteria: "last_3_months" as const,
      getEligibilityDescription: () =>
        "At least one transaction in the last 3 months",
    };
  }
}

// Get platform configuration
export async function getPlatformConfig() {
  try {
    return {
      name: await getTypedSetting("platform_name", "MORRIS MONYE"),
      tagline: await getTypedSetting(
        "platform_tagline",
        "Diasporans funding sustainable development across Africa."
      ),
      supportEmail: await getTypedSetting("support_email", "support@morrismonye.org"),
      defaultCurrency: await getTypedSetting("default_currency", "NGN"),
      minimumPledgeAmount: await getTypedSetting("minimum_pledge_amount", 5.0),
      platformFeePercentage: await getTypedSetting(
        "platform_fee_percentage",
        5.0
      ),
      enableDarkMode: await getTypedSetting("enable_dark_mode", true),
    };
  } catch (error) {
    console.error("Error getting platform config:", error);
    return {
      name: "MORRIS MONYE",
      tagline: "Diasporans funding sustainable development across Africa.",
      supportEmail: "support@morrismonye.org",
      defaultCurrency: "NGN",
      minimumPledgeAmount: 5.0,
      platformFeePercentage: 5.0,
      enableDarkMode: true,
    };
  }
}

// Format currency based on platform settings
export async function formatCurrency(amount: number): Promise<string> {
  const currency = await getTypedSetting("default_currency", "USD");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "NGN" ? "NGN" : currency,
  }).format(amount);
}

// Check if user can vote based on settings
export async function canUserVote(
  userPledgeAmount: number,
  lastTransactionDate: Date
): Promise<boolean> {
  try {
    const config = await getVotingConfig();

    // Check minimum pledge amount
    if (userPledgeAmount < config.minPledgeAmount) {
      return false;
    }

    // Check transaction history
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    switch (config.eligibilityCriteria) {
      case "last_3_months":
        return daysDiff <= 90;
      case "last_6_months":
        return daysDiff <= 180;
      case "one_ever":
        return true; // As long as they have a transaction date
      default:
        return false;
    }
  } catch (error) {
    console.error("Error checking user voting eligibility:", error);
    return false;
  }
}
