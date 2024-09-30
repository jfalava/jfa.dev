import React, { useState, useEffect } from "react";

const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const shouldShowButton = window.scrollY > 200;
      if (shouldShowButton !== isVisible) {
        setIsVisible(shouldShowButton);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isVisible]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      id="scrollToTopBtn"
      role="button"
      aria-label="Go To Top Button"
      className={`border-black dark:border-white fixed bottom-[33%] right-[-5px] mobile-only:right-[-2px] z-50 p-4 mobile-only:p-1 rounded-tl-[50%] rounded-bl-[50%] transition-opacity duration-500 glassbox select-none ${
        isVisible ? "slide-in-right" : "slide-out-right"
      }`}
      onClick={scrollToTop}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 mobile-only:h-10 w-auto"
        viewBox="0 0 12 12"
      >
        <path
          fill="currentColor"
          d="M4.146 6.146a.5.5 0 1 0 .708.708L6 5.707l1.146 1.147a.5.5 0 1 0 .708-.708l-1.5-1.5a.5.5 0 0 0-.708 0zM1 6a5 5 0 1 0 10 0A5 5 0 0 0 1 6m5 4a4 4 0 1 1 0-8a4 4 0 0 1 0 8"
        ></path>
      </svg>
    </button>
  );
};

export default ScrollToTopButton;
