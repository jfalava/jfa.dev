import React, { useState, useEffect, useRef } from "react";

type TooltipPosition = "top" | "right" | "bottom" | "left";

interface SimpleTooltipProps {
  content: string;
  position?: TooltipPosition;
  children: React.ReactNode;
}

const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  position = "top",
  children,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const positionClasses: Record<TooltipPosition, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "top-1/2 left-full -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "top-1/2 right-full -translate-y-1/2 mr-2",
  };

  const arrowClasses: Record<TooltipPosition, string> = {
    top: "top-full left-1/2 -translate-x-1/2 dark:border-t-gray-600 border-t-blue-500",
    right:
      "top-1/2 right-full -translate-y-1/2 dark:border-r-gray-600 border-t-blue-500",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 dark:border-b-gray-600 border-t-blue-500",
    left: "top-1/2 left-full -translate-y-1/2 dark:border-l-gray-600 border-t-blue-500",
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  return (
    <div
      className="relative inline-block tooltip-container text-nowrap"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onTouchStart={showTooltip}
      ref={tooltipRef}
    >
      {children}
      <div
        className={`absolute geist z-10 transition-opacity duration-300 glassbox dark:text-[#efefef] text-[#181a1b] text-sm rounded py-1 px-2 ${positionClasses[position]} ${isVisible ? "opacity-100" : "invisible opacity-0"}`}
      >
        {content}
        <div
          className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
        />
      </div>
    </div>
  );
};

export default SimpleTooltip;
