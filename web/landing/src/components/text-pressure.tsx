import { useEffect, useRef, useState, useMemo, useCallback } from "react";

interface TextPressureProps {
  text?: string;
  fontFamily?: string;
  fontUrl?: string;
  width?: boolean;
  weight?: boolean;
  italic?: boolean;
  alpha?: boolean;
  flex?: boolean;
  stroke?: boolean;
  scale?: boolean;
  textColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  className?: string;
  minFontSize?: number;
  useWebkitFallback?: boolean;
  webkitFallbackClassName?: string;
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getAttr = (distance: number, maxDist: number, minVal: number, maxVal: number) => {
  const val = maxVal - Math.abs((maxVal * distance) / maxDist);
  return Math.max(minVal, val + minVal);
};

const debounce = <TArgs extends unknown[]>(func: (...args: TArgs) => void, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: TArgs) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const TextPressure: React.FC<TextPressureProps> = ({
  text = "Compressa",
  fontFamily,
  fontUrl,
  width = true,
  weight = true,
  italic = true,
  alpha = false,
  flex = true,
  stroke = false,
  scale = false,
  textColor = "#FFFFFF",
  strokeColor = "#FF0000",
  strokeWidth = 2,
  className = "",
  minFontSize = 24,
  useWebkitFallback = true,
  webkitFallbackClassName = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const spansRef = useRef<(HTMLSpanElement | null)[]>([]);

  const mouseRef = useRef({ x: 0, y: 0 });
  const cursorRef = useRef({ x: 0, y: 0 });

  const [fontSize, setFontSize] = useState(minFontSize);
  const [scaleY, setScaleY] = useState(1);
  const [lineHeight, setLineHeight] = useState(1);
  const [isWebKitBrowser, setIsWebKitBrowser] = useState(false);

  const chars = text.split("");
  const shouldRenderWebkitFallback = useWebkitFallback && isWebKitBrowser;

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    const isWebKitEngine = /AppleWebKit/i.test(navigator.userAgent);
    const isChromium = /Chrome|Chromium|CriOS|Edg|OPR/i.test(navigator.userAgent);
    setIsWebKitBrowser(isWebKitEngine && !isChromium);
  }, []);

  useEffect(() => {
    if (shouldRenderWebkitFallback) {
      return;
    }

    const ownerWindow = containerRef.current?.ownerDocument?.defaultView ?? window;

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      cursorRef.current.x = t.clientX;
      cursorRef.current.y = t.clientY;
    };

    ownerWindow.addEventListener("mousemove", handleMouseMove);
    ownerWindow.addEventListener("touchmove", handleTouchMove, { passive: true });

    if (containerRef.current) {
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = left + width / 2;
      mouseRef.current.y = top + height / 2;
      cursorRef.current.x = mouseRef.current.x;
      cursorRef.current.y = mouseRef.current.y;
    }

    return () => {
      ownerWindow.removeEventListener("mousemove", handleMouseMove);
      ownerWindow.removeEventListener("touchmove", handleTouchMove);
    };
  }, [shouldRenderWebkitFallback]);

  const setSize = useCallback(() => {
    if (shouldRenderWebkitFallback) {
      return;
    }

    if (!containerRef.current || !titleRef.current) {
      return;
    }

    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();

    let newFontSize = containerW / (chars.length / 2);
    newFontSize = Math.max(newFontSize, minFontSize);

    setFontSize(newFontSize);
    setScaleY(1);
    setLineHeight(1);

    requestAnimationFrame(() => {
      if (!titleRef.current) {
        return;
      }
      const textRect = titleRef.current.getBoundingClientRect();

      if (scale && textRect.height > 0) {
        const yRatio = containerH / textRect.height;
        setScaleY(yRatio);
        setLineHeight(yRatio);
      }
    });
  }, [chars.length, minFontSize, scale, shouldRenderWebkitFallback]);

  useEffect(() => {
    if (shouldRenderWebkitFallback) {
      return;
    }

    const ownerWindow = containerRef.current?.ownerDocument?.defaultView ?? window;
    const debouncedSetSize = debounce(setSize, 100);
    debouncedSetSize();
    ownerWindow.addEventListener("resize", debouncedSetSize);
    return () => ownerWindow.removeEventListener("resize", debouncedSetSize);
  }, [setSize, shouldRenderWebkitFallback]);

  useEffect(() => {
    if (shouldRenderWebkitFallback) {
      return;
    }

    let rafId: number;
    const animate = () => {
      mouseRef.current.x += (cursorRef.current.x - mouseRef.current.x) / 15;
      mouseRef.current.y += (cursorRef.current.y - mouseRef.current.y) / 15;

      if (titleRef.current) {
        const titleRect = titleRef.current.getBoundingClientRect();
        const maxDist = titleRect.width / 2;

        spansRef.current.forEach((span) => {
          if (!span) {
            return;
          }

          const rect = span.getBoundingClientRect();
          const charCenter = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
          };

          const d = dist(mouseRef.current, charCenter);

          const wdth = width ? Math.floor(getAttr(d, maxDist, 5, 200)) : 100;
          const wght = weight ? Math.floor(getAttr(d, maxDist, 100, 900)) : 400;
          const italVal = italic ? getAttr(d, maxDist, 0, 1).toFixed(2) : "0";
          const alphaVal = alpha ? getAttr(d, maxDist, 0, 1).toFixed(2) : "1";

          const newFontVariationSettings = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${italVal}`;

          if (span.style.fontVariationSettings !== newFontVariationSettings) {
            span.style.fontVariationSettings = newFontVariationSettings;
          }
          if (alpha && span.style.opacity !== alphaVal) {
            span.style.opacity = alphaVal;
          }
        });
      }

      rafId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(rafId);
  }, [width, weight, italic, alpha, shouldRenderWebkitFallback]);

  const styleElement = useMemo(() => {
    return (
      <style>{`
        ${
          fontUrl && fontFamily
            ? `@font-face {
          font-family: '${fontFamily}';
          src: url('${fontUrl}');
          font-style: normal;
        }`
            : ""
        }
        .stroke span {
          position: relative;
          color: ${textColor};
        }
        .stroke span::after {
          content: attr(data-char);
          position: absolute;
          left: 0;
          top: 0;
          color: transparent;
          z-index: -1;
          -webkit-text-stroke-width: ${strokeWidth}px;
          -webkit-text-stroke-color: ${strokeColor};
        }
      `}</style>
    );
  }, [fontFamily, fontUrl, textColor, strokeColor, strokeWidth]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-transparent">
      {styleElement}
      {shouldRenderWebkitFallback ? (
        <h1
          className={`text-center ${className} ${webkitFallbackClassName}`}
          style={{
            fontFamily: fontFamily || undefined,
            margin: 0,
            color: stroke ? undefined : textColor,
          }}
        >
          {text}
        </h1>
      ) : null}
      <h1
        ref={titleRef}
        className={`text-pressure-title ${className} ${
          flex ? "flex justify-between" : ""
        } ${stroke ? "stroke" : ""} text-center`}
        style={{
          display: shouldRenderWebkitFallback ? "none" : undefined,
          fontFamily: fontFamily || undefined,
          fontSize: fontSize,
          lineHeight,
          transform: `scale(1, ${scaleY})`,
          transformOrigin: "center top",
          margin: 0,
          fontWeight: 100,
          color: stroke ? undefined : textColor,
        }}
      >
        {chars.map((char, i) => (
          <span
            key={i}
            ref={(el) => {
              spansRef.current[i] = el;
            }}
            data-char={char}
            className="inline-block"
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </h1>
    </div>
  );
};

export default TextPressure;
