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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-auto"
        viewBox="0 0 24 24"
      >
        <g
          fill="none"
          stroke="white"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        >
          <path d="M8 21H6a3 3 0 0 1-3-3v-1h5.5M17 8.5V5a2 2 0 1 1 2 2h-2" />
          <path d="M19 3H8a3 3 0 0 0-3 3v11M9 7h4m-4 4h4m5.42 1.61a2.1 2.1 0 0 1 2.97 2.97L15 22h-3v-3z" />
        </g>
      </svg>
    </p>
  );
};

export default NDA;
