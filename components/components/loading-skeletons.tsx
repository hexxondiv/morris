// @/components/loading-skeleton-cards.tsx

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

// Modern shimmer component for consistent animations
const Shimmer: React.FC<{ className?: string; children?: React.ReactNode }> = ({ 
  className = '', 
  children 
}) => (
  <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    {children}
  </div>
);

// Modern project card skeleton with clear boundaries
const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Card header with clear separation */}
      <div className="relative h-48 sm:h-56 bg-slate-50 border-b border-slate-100">
        <Shimmer className="w-full h-full rounded-t-2xl">
          {/* Mock image placeholder */}
          <div className="absolute inset-4 bg-slate-200 rounded-lg opacity-40" />
        </Shimmer>
        
        {/* Status badge overlay */}
        <div className="absolute top-4 left-4">
          <Shimmer className="w-20 h-6 rounded-full" />
        </div>
      </div>
      
      {/* Card content with proper spacing */}
      <div className="p-6 space-y-4">
        {/* Title section */}
        <div className="space-y-3">
          <Shimmer className="h-6 rounded-md w-4/5" />
          <Shimmer className="h-5 rounded-md w-3/5" />
        </div>
        
        {/* Metadata row */}
        <div className="flex items-center gap-3 pt-2">
          <Shimmer className="w-5 h-5 rounded" />
          <Shimmer className="h-4 rounded w-24" />
          <div className="flex-1" />
          <Shimmer className="w-16 h-4 rounded" />
        </div>
        
        {/* Action button */}
        <div className="pt-2">
          <Shimmer className="h-10 rounded-lg w-28" />
        </div>
      </div>
    </div>
  );
};

// Modern metric card skeleton with data visualization feel
const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header with icon and title */}
      <div className="flex items-start gap-3 mb-6">
        <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-5 rounded w-32" />
          <Shimmer className="h-4 rounded w-20" />
        </div>
      </div>
      
      {/* Main metric value */}
      <div className="space-y-2 mb-6">
        <Shimmer className="h-12 rounded-lg w-36" />
        <div className="flex items-center gap-2">
          <Shimmer className="w-4 h-4 rounded" />
          <Shimmer className="h-4 rounded w-16" />
        </div>
      </div>
      
      {/* Mini chart representation */}
      <div className="mb-6">
        <div className="flex items-end gap-1 h-16">
          {Array.from({ length: 8 }).map((_, i) => (
            <Shimmer 
              key={i} 
              className={`flex-1 rounded-t ${
                i % 3 === 0 ? 'h-8' : i % 2 === 0 ? 'h-12' : 'h-6'
              }`} 
            />
          ))}
        </div>
      </div>
      
      {/* Footer action */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 rounded w-20" />
        <Shimmer className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  );
};

// Compact list-style skeleton for variety
const ListItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300">
      {/* List item with avatar and content */}
      <div className="flex items-start gap-4">
        <Shimmer className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <Shimmer className="h-5 rounded w-3/4" />
            <Shimmer className="h-4 rounded w-1/2" />
          </div>
          
          {/* Tags or metadata */}
          <div className="flex gap-2">
            <Shimmer className="h-6 rounded-full w-16" />
            <Shimmer className="h-6 rounded-full w-12" />
            <Shimmer className="h-6 rounded-full w-20" />
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Shimmer className="h-4 rounded w-24" />
            <div className="flex gap-2">
              <Shimmer className="w-8 h-8 rounded-lg" />
              <Shimmer className="w-8 h-8 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main loading skeleton component with improved organization
interface MarqueeLoadingSkeletonProps {
  count?: number;
  type?: 'projects' | 'metrics' | 'mixed' | 'list';
  className?: string;
  showLoadingIndicator?: boolean;
}

export const MarqueeLoadingSkeleton: React.FC<MarqueeLoadingSkeletonProps> = ({ 
  count = 6, 
  type = 'mixed',
  className = '',
  showLoadingIndicator = true
}) => {
  const renderSkeletonCard = (index: number) => {
    switch (type) {
      case 'projects':
        return <ProjectCardSkeleton key={`project-${index}`} />;
      case 'metrics':
        return <MetricCardSkeleton key={`metric-${index}`} />;
      case 'list':
        return <ListItemSkeleton key={`list-${index}`} />;
      case 'mixed':
      default:
        // Cycle through different types for variety
        const types = [ProjectCardSkeleton, MetricCardSkeleton, ListItemSkeleton];
        const Component = types[index % types.length];
        return <Component key={`mixed-${index}`} />;
    }
  };

  const getSlideConfig = () => {
    switch (type) {
      case 'list':
        return {
          default: 1,
          sm: 2,
          lg: 3,
          xl: 4
        };
      case 'metrics':
        return {
          default: 1,
          sm: 2,
          lg: 2,
          xl: 3
        };
      case 'projects':
      default:
        return {
          default: 1,
          sm: 1,
          lg: 2,
          xl: 3
        };
    }
  };

  const slideConfig = getSlideConfig();

  return (
    <section className={`relative ${className}`}>
      <div className="relative">
        <Swiper
          modules={[Autoplay]}
          spaceBetween={20}
          slidesPerView={slideConfig.default}
          loop={false}
          autoplay={false}
          speed={0}
          allowTouchMove={false}
          breakpoints={{
            640: { 
              slidesPerView: slideConfig.sm,
              spaceBetween: 20
            },
            1024: { 
              slidesPerView: slideConfig.lg,
              spaceBetween: 24
            },
            1280: { 
              slidesPerView: slideConfig.xl,
              spaceBetween: 28
            },
          }}
          className="modern-skeleton-swiper"
        >
          {Array.from({ length: count }).map((_, index) => (
            <SwiperSlide key={index} className="h-auto">
              <div className="h-full">
                {renderSkeletonCard(index)}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Modern loading indicator */}
        {showLoadingIndicator && (
          <div className="absolute top-4 right-4 z-20">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full px-4 py-2 shadow-lg">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span className="text-sm font-medium text-slate-600">Loading</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .modern-skeleton-swiper .swiper-slide {
          height: auto;
          display: flex;
          flex-direction: column;
        }
        
        .modern-skeleton-swiper .swiper-slide > div {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        /* Modern shimmer animation */
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        /* Enhanced card hover effects */
        .group:hover {
          transform: translateY(-2px);
        }

        /* Smooth loading state transitions */
        .modern-skeleton-swiper {
          opacity: 0;
          animation: fadeIn 0.5s ease-out forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive spacing improvements */
        @media (max-width: 640px) {
          .modern-skeleton-swiper .swiper-slide {
            padding: 0 4px;
          }
        }
      `}</style>
    </section>
  );
};

/** Spans only — safe inside `<p>`, `<h1>`, and other phrasing-content parents (no `<div>` inside `<p>` hydration errors). */
export const ShimmerSkeleton = ({
  width = "w-32",
  height = "h-6",
  className = "",
  rounded = "rounded-md",
}: {
  width?: string;
  height?: string;
  className?: string;
  rounded?: string;
}) => (
  <span
    className={`${width} ${height} ${rounded} ${className} relative inline-block overflow-hidden bg-gray-200 align-middle`}
    aria-hidden="true"
  >
    <span className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </span>
);

// Individual skeleton exports for custom usage
export { ProjectCardSkeleton, MetricCardSkeleton, ListItemSkeleton, Shimmer };

// Default export
export default MarqueeLoadingSkeleton;