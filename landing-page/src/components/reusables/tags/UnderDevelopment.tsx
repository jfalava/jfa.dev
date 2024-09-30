import React from "react";

interface Props {
  lang: string;
}

const UnderDevelopment: React.FC<Props> = ({ lang }) => {
  const getTitle = () => {
    switch (lang) {
      case "en":
        return "Under development";
      case "es":
        return "En desarrollo";
      case "pt":
        return "Em desenvolvimento";
      default:
        return "En desarrollo";
    }
  };

  return (
    <div
      className="jetbrains p-1 text-white text-nowrap text-sm rounded px-1.5 ml-1.5 select-none whitespace-nowrap cursor-help border-2 border-[#187dd6] bg-[#05345d]"
      title={getTitle()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-auto"
        viewBox="0 0 24 24"
      >
        <path
          fill="none"
          stroke="white"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m7 8l-4 4l4 4m10-8l4 4l-4 4M14 4l-4 16"
        />
      </svg>
    </div>
  );
};

export default UnderDevelopment;
