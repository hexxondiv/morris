interface PulsingOnlineIndicatorProps {
  size?: number;
  className?: string;
  color?: string;
};

const PulsingOnlineIndicator: React.FC<PulsingOnlineIndicatorProps> = ({size,className,color}) => {
  return (
    // <svg
    //   width={size ?? 30}
    //   height={size ?? 30}
    //   viewBox="0 0 40 40"
    //   fill="none"
    //   xmlns="http://www.w3.org/2000/svg"
    //   className={`inline-block !m-0 ${className ?? ''}`}
    // >
    //   <circle cx="20" cy="20" r="8" fill={color ?? "#22c55e"} /> {/* Center dot */}
    //   <circle cx="20" cy="20" r="8" fill={color ?? "#22c55e"} className="pulse pulse-1" />
    //   <circle cx="20" cy="20" r="8" fill={color ?? "#22c55e"} className="pulse pulse-2" />
    //   <circle cx="20" cy="20" r="8" fill={color ?? "#22c55e"} className="pulse pulse-3" />
    // </svg>
    <div className="w-2 h-2 bg-lime mr-2 rounded-full animate-pulse"></div>
  );
};

export default PulsingOnlineIndicator;
