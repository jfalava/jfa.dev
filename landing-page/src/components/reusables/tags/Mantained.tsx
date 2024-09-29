import React from "react";

interface Props {
  lang: string;
}

const Mantained: React.FC<Props> = ({ lang }) => {
  const getTitle = () => {
    switch (lang) {
      case "en":
        return "Mantained";
      case "es":
        return "Mantenido";
      case "pt":
        return "Mantido";
      default:
        return "Mantenido";
    }
  };

  return (
    <p
      className="jetbrains p-[2px] text-white text-nowrap text-sm rounded px-1.5 ml-1.5 select-none whitespace-nowrap cursor-help border-2 border-[#7df369] bg-[#4ba12e]"
      title={getTitle()}
    >
      {getTitle()}
    </p>
  );
};

export default Mantained;
