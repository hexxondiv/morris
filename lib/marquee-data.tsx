// lib/marquee-data.ts - Helper functions to generate marquee items

import { getDashboardMetrics, getMarqueeConfig } from "./settings-utils";

// Mock project data - replace with actual project fetching
interface Project {
  id: string;
  title: string;
  description: string;
  country: string;
  imageUrl: string;
  progress?: number;
  fundingGoal?: number;
  currentFunding?: number;
}

// Generate marquee items based on settings
export async function generateMarqueeItems(): Promise<MarqueeItem[]> {
  const config = await getMarqueeConfig();

  if (config.contentType === "projects") {
    return await generateProjectItems(config.featuredProjectsCount);
  } else {
    return await generateMetricItems(config.selectedMetrics);
  }
}

// Generate project marquee items
async function generateProjectItems(count: number): Promise<MarqueeItem[]> {
  // In real implementation, fetch from your projects database
  const mockProjects: Project[] = [
    {
      id: "1",
      title: "Clean Water Initiative",
      description:
        "Bringing clean water to rural communities in Northern Ghana",
      country: "Ghana",
      imageUrl: "/images/projects/water-project.jpg",
      progress: 75,
      fundingGoal: 50000,
      currentFunding: 37500,
    },
    {
      id: "2",
      title: "Solar Power Education",
      description: "Installing solar panels in schools across Kenya",
      country: "Kenya",
      imageUrl: "/images/projects/solar-project.jpg",
      progress: 60,
      fundingGoal: 30000,
      currentFunding: 18000,
    },
    {
      id: "3",
      title: "Agricultural Training Program",
      description: "Training farmers in sustainable agriculture techniques",
      country: "Nigeria",
      imageUrl: "/images/projects/agriculture-project.jpg",
      progress: 90,
      fundingGoal: 25000,
      currentFunding: 22500,
    },
    {
      id: "4",
      title: "Healthcare Access Initiative",
      description: "Mobile healthcare units for remote communities",
      country: "Uganda",
      imageUrl: "/images/projects/healthcare-project.jpg",
      progress: 45,
      fundingGoal: 40000,
      currentFunding: 18000,
    },
  ];

  // Take only the requested number of projects
  const selectedProjects = mockProjects.slice(0, count);

  return selectedProjects.map((project) => ({
    type: "project" as const,
    href: `/projects/${project.id}`,
    country: project.country,
    description: project.description,
    image_src: project.imageUrl,
    imageAlt: project.description,
    progress: project.progress,
    title: project.title,
  }));
}

// Generate metric marquee items
async function generateMetricItems(
  selectedMetrics: string[]
): Promise<MarqueeItem[]> {
  const metrics = await getDashboardMetrics();

  const metricDefinitions: Record<
    string,
    {
      title: string;
      getValue: (metrics: any) => string;
      unit?: string;
      href: string;
      trend?: { direction: "up" | "down" | "neutral"; value: string };
    }
  > = {
    active_villagers: {
      title: "Active supporters",
      getValue: (m) => m.activeVillagers.toLocaleString(),
      href: "/dashboard/users",
      trend: { direction: "up", value: "+12% this month" },
    },
    monthly_contributions: {
      title: "Monthly contributions",
      getValue: (m) => `$${m.monthlyContributions.toLocaleString()}`,
      href: "/dashboard/contributions",
      trend: { direction: "up", value: "+8% vs last month" },
    },
    cash_on_hand: {
      title: "Cash on hand",
      getValue: (m) => `$${m.cashOnHand.toLocaleString()}`,
      href: "/dashboard/finances",
      trend: { direction: "neutral", value: "Stable" },
    },
    monthly_fixed_costs: {
      title: "Monthly fixed costs",
      getValue: (m) => `$${m.monthlyFixedCosts.toLocaleString()}`,
      href: "/dashboard/expenses",
      trend: { direction: "down", value: "-3% optimized" },
    },
    cash_deployed: {
      title: "Cash deployed",
      getValue: (m) => `$${m.cashDeployed.toLocaleString()}`,
      href: "/dashboard/deployments",
      trend: { direction: "up", value: "+15% this quarter" },
    },
  };

  return selectedMetrics
    .filter((metricKey) => metricDefinitions[metricKey])
    .map((metricKey) => {
      const definition = metricDefinitions[metricKey];
      return {
        type: "metric" as const,
        metric_type: metricKey,
        title: definition.title,
        value: definition.getValue(metrics),
        unit: definition.unit,
        href: definition.href,
        trend: definition.trend,
      };
    });
}

// Get featured projects for other components
export async function getFeaturedProjects(limit?: number): Promise<Project[]> {
  // Mock data - replace with actual database query
  const mockProjects: Project[] = [
    {
      id: "1",
      title: "Clean Water Initiative",
      description:
        "Bringing clean water to rural communities in Northern Ghana",
      country: "Ghana",
      imageUrl: "/images/projects/water-project.jpg",
      progress: 75,
      fundingGoal: 50000,
      currentFunding: 37500,
    },
    {
      id: "2",
      title: "Solar Power Education",
      description: "Installing solar panels in schools across Kenya",
      country: "Kenya",
      imageUrl: "/images/projects/solar-project.jpg",
      progress: 60,
      fundingGoal: 30000,
      currentFunding: 18000,
    },
    {
      id: "3",
      title: "Agricultural Training Program",
      description: "Training farmers in sustainable agriculture techniques",
      country: "Nigeria",
      imageUrl: "/images/projects/agriculture-project.jpg",
      progress: 90,
      fundingGoal: 25000,
      currentFunding: 22500,
    },
  ];

  return limit ? mockProjects.slice(0, limit) : mockProjects;
}

// Usage example in your homepage component:
/*
// app/page.tsx or components/HomePage.tsx
import { generateMarqueeItems } from '@/lib/marquee-data';
import MarqueeContainer from '@/components/MarqueeContainer';

export default async function HomePage() {
  const marqueeItems = await generateMarqueeItems();
  
  return (
    <div>
      {/* Other homepage content }
//       <MarqueeContainer items={marqueeItems} />
//       {/* More content /}
//     </div>
//   );
// }
// */

// For client-side usage, create an API endpoint:
// app/api/marquee/route.ts
// export async function GET() {
//   try {
//     const items = await generateMarqueeItems();
//     return Response.json(items);
//   } catch (error) {
//     console.error('Error generating marquee items:', error);
//     return Response.json({ error: 'Failed to generate marquee items' }, { status: 500 });
//   }
// }

// Types for the marquee items (add to your types/marquee.ts)
export interface MarqueeItemBase {
  type: "project" | "metric";
  href: string;
  title?: string;
}

export interface ProjectMarqueeItem extends MarqueeItemBase {
  type: "project";
  country: string;
  description: string;
  image_src: string;
  imageAlt: string;
  progress?: number;
}

export interface MetricMarqueeItem extends MarqueeItemBase {
  type: "metric";
  metric_type: string;
  title: string;
  value: string;
  unit?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
}

export type MarqueeItem = ProjectMarqueeItem | MetricMarqueeItem;

export interface MarqueeContainerProps {
  items: MarqueeItem[];
}
