"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import {
  Users,
  DollarSign,
  Wallet,
  TrendingUp,
  MapPin,
  ArrowRight,
} from "lucide-react";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/autoplay";
import Metrics from "./metrics";
import { MarqueeItem as MarqueeItemType } from "@/types/marquee";
import Link from "next/link";
import { ProjectCard } from "./project-card";
import { formatCountAbv, formatCurrency } from "@/lib/utils";
import { useMarqueeData } from "@/hooks/use-marquee";
import MarqueeLoadingSkeleton from "./loading-skeletons";

interface MarqueeItemProps {
  item: MarqueeItemType;
  /** From `/api/marquee-data` `default_currency`; avoids hard-coding NGN on tiles. */
  currency: string;
}

// Icon mapping for metrics
const getMetricIcon = (metric_type: string) => {
  switch (metric_type) {
    case "active_villagers":
      return Users;
    case "monthly_contributions":
      return DollarSign;
    case "cash_on_hand":
      return Wallet;
    case "monthly_fixed_costs":
    case "monthly_operational_costs":
    case "cash_deployed":
      return TrendingUp;
    default:
      return MapPin;
  }
};

// Get metric emoji
const getMetricEmoji = (metric_type: string) => {
  switch (metric_type) {
    case "active_villagers":
      return "👤";
    case "monthly_contributions":
      return "🫴🏾";
    case "cash_on_hand":
      return "💵";
    case "monthly_fixed_costs":
    case "monthly_operational_costs":
      return "💸";
    case "cash_deployed":
      return "🌍";
    case "monthly_operational_costs":
      return "💰";
    default:
      return "";
  }
};

// Get metric display title
const getMetricTitle = (metric_type: string) => {
  switch (metric_type) {
    case "active_villagers":
      return "Active supporters";
    case "monthly_contributions":
      return "Monthly Contributions";
    case "cash_on_hand":
      return "Cash on Hand";
    case "monthly_fixed_costs":
    case "monthly_operational_costs":
      return "Monthly Fixed Costs";
    case "cash_deployed":
      return "Cash Deployed";
    default:
      return metric_type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
  }
};

const MarqueeItem: React.FC<MarqueeItemProps> = ({ item, currency }) => {
  if (item.type === "project") {
    return (
      <div className="h-full">
        <ProjectCard
          project={{
            ...item,
            id: item.id,
            slug: item.slug || "",
            status: item.status || ("active" as any),
            title: item.title || item.description || "",
            cover_image: item.image_src,
            description: item.description || "",
            goal_amount: item.goal_amount || 0,
            current_amount: item.current_amount,
            created_at: item.created_at || new Date().toISOString(),
            state: item.country || "Nigeria",
          }}
          viewMode="grid"
        />
      </div>
    );
  } else {
    const metricKey = item.metric_type || item.id || "";
    const emoji = getMetricEmoji(metricKey);
    const title = getMetricTitle(metricKey || item.label || "");
    const rawAmount = Number(item.value || "");
    const isCurrencyMetric =
      metricKey.includes("amount") ||
      metricKey.includes("contributions") ||
      metricKey.includes("costs") ||
      metricKey.includes("cash") ||
      metricKey.includes("deployed");
    const formattedValue = isCurrencyMetric
      ? formatCurrency(
          Number.isFinite(rawAmount) ? rawAmount : 0,
          currency || "NGN",
          {
            forceDecimals: true,
          }
        )
      : formatCountAbv(Number.isFinite(rawAmount) ? rawAmount : 0);

    return (
      <div className="w-full sm:max-w-96 h-full">
        <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="h-full flex flex-col justify-between space-y-4 px-6 sm:px-8 py-7 sm:py-9">
            <div className="flex items-center gap-2">
              <div className="text-lg font-medium text-mud-800">
                {emoji && <span className="mr-2">{emoji}</span>}
                {title}
              </div>
            </div>

            <div className="text-4xl font-medium text-mud-900">
              {formattedValue}
              {item.unit && (
                <span className="ml-1 text-lg font-normal text-mud-600">
                  {item.unit}
                </span>
              )}

              {item.trend && (
                <div
                  className={`text-sm mt-2 flex items-center ${
                    item.trend.direction === "up"
                      ? "text-green-600"
                      : item.trend.direction === "down"
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  <TrendingUp
                    className={`w-3 h-3 mr-1 ${
                      item.trend.direction === "down" ? "rotate-180" : ""
                    }`}
                  />
                  <span>{item.trend.value}</span>
                </div>
              )}
            </div>

            <div className="mt-auto">
              <Link
                href="/public-ledger"
                className="button-secondary-md inline-block px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all duration-200 hover:scale-105"
              >
                View details
                <ArrowRight className="w-3 h-3 ml-2 inline" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

const MarqueeContainer = () => {
  const { items, loading, error, refetch, currency, analytics, isStale } =
    useMarqueeData();

  // Determine content type for skeleton
  const hasProjects = items.some((item) => item.type === "project");
  const hasMetrics = items.some((item) => item.type === "metric");
  const isMixedContent = hasProjects && hasMetrics;
  const useProjectLayout = hasProjects || isMixedContent;

  // Determine skeleton type
  const getSkeletonType = (): "projects" | "metrics" | "mixed" => {
    return "projects";
    if (isMixedContent) return "mixed";
    if (hasProjects) return "projects";
    if (hasMetrics) return "metrics";
    return "mixed";
  };

  // Show loading skeleton while data is loading
  if (loading) {
    return (
      <section className="relative">
        <MarqueeLoadingSkeleton
          count={5}
          type={getSkeletonType()}
        />

        {/* Metrics component - you might want to show a skeleton version of this too */}
        <Metrics
          message="Rated excellent on Trustpilot"
          buttonInfo={{ href: "/sign-in", text: "Join the campaign" }}
        />
      </section>
    );
  }

  // Handle error state (optional)
  if (error) {
    return (
      <section className="relative">
        <div className="flex items-center justify-center h-[400px] sm:h-[480px] bg-gray-50 rounded-2xl">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Failed to load content</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-theme-600 text-white rounded-lg hover:bg-theme-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>

        <Metrics
          message="Rated excellent on Trustpilot"
          buttonInfo={{ href: "/sign-in", text: "Join the campaign" }}
        />
      </section>
    );
  }

  // Render actual content when data is loaded
  return (
    <section className="relative">
      <div className="relative">
        <Swiper
          modules={[Navigation, Autoplay]}
          spaceBetween={24}
          slidesPerView={useProjectLayout ? 4 : 3}
          loop={items.length > 3}
          autoplay={{
            delay: isMixedContent ? 4000 : hasMetrics ? 4000 : 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          speed={800}
          navigation={{
            nextEl: ".marquee-button-next",
            prevEl: ".marquee-button-prev",
          }}
          breakpoints={{
            320: {
              slidesPerView: 1,
              spaceBetween: 16,
            },
            640: {
              slidesPerView: 2,
              spaceBetween: 20,
            },
            1024: {
              slidesPerView: useProjectLayout ? 3 : 3,
              spaceBetween: 24,
            },
            1280: {
              slidesPerView: useProjectLayout ? 4 : 4,
              spaceBetween: 24,
            },
          }}
          className="marquee-swiper !px-4"
        >
          {items.map((item, index) => (
            <SwiperSlide key={`${item.type}-${index}`} className="h-auto">
              <MarqueeItem item={item} currency={currency} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Buttons */}
        {items.length > 3 && (
          <div className="hidden sm:block">
            <button className="marquee-button-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-all duration-200 flex items-center justify-center group hover:scale-110">
              <ArrowRight className="w-5 h-5 text-gray-700 rotate-180 group-hover:text-theme-600 transition-colors" />
            </button>
            <button className="marquee-button-next absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-all duration-200 flex items-center justify-center group hover:scale-110">
              <ArrowRight className="w-5 h-5 text-gray-700 group-hover:text-theme-600 transition-colors" />
            </button>
          </div>
        )}
      </div>

      {/* Metrics component */}
      <Metrics
        message="Rated excellent on Trustpilot"
        buttonInfo={{ href: "/sign-in", text: "Join the campaign" }}
      />
    </section>
  );
};

export default MarqueeContainer;
