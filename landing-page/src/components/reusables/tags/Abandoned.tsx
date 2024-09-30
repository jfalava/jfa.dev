import React from "react";

interface Props {
  lang: string;
}

const Abandoned: React.FC<Props> = ({ lang }) => {
  const getTitle = () => {
    switch (lang) {
      case "en":
        return "Abandonado";
      case "es":
        return "Abandoned";
      case "pt":
        return "Abandonado";
      default:
        return "Abandonado";
    }
  };

  return (
    <p
      className="jetbrains p-1 text-white text-nowrap text-sm rounded px-1.5 ml-1.5 select-none whitespace-nowrap cursor-help border-2 border-[#f45a5a] bg-[#f71616]"
      title={getTitle()}
    >
      {getTitle()}
    </p>
  );
};

export default Abandoned;
