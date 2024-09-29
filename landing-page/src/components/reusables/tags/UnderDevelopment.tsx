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
    <p
      className="jetbrains p-[2px] text-white text-nowrap text-sm rounded px-1.5 ml-1.5 select-none whitespace-nowrap cursor-help border-2 border-[#187dd6] bg-[#05345d]"
      title={getTitle()}
    >
      {getTitle()}
    </p>
  );
};

export default UnderDevelopment;
