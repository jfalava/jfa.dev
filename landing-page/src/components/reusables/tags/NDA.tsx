import React from "react";

interface Props {
  lang: string;
}

const NDA: React.FC<Props> = ({ lang }) => {
  const getContent = () => {
    switch (lang) {
      case "en":
        return "NDA";
      case "es":
        return "ADC";
      case "pt":
        return "ADC";
      default:
        return "ADC";
    }
  };
  const getTitle = () => {
    switch (lang) {
      case "en":
        return "Non-disclosure Agreement";
      case "es":
        return "Acuerdo de confidencialidad";
      case "pt":
        return "Acordo de confidencialidade";
      default:
        return "Acuerdo de confidencialidad";
    }
  };

  return (
    <p
      className="jetbrains p-[2px] text-white text-nowrap text-sm rounded px-1.5 ml-1.5 select-none whitespace-nowrap cursor-help border-2 border-[#f8c476] bg-[#d28718]"
      title={getTitle()}
    >
      {getContent()}
    </p>
  );
};

export default NDA;
