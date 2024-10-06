import React from "react";
import SimpleTooltip from "@/components/reusables/text-elements/SimpleTooltip.tsx";

interface Props {
  lang: string;
  client?: string;
}

const Archived: React.FC<Props> = ({ lang, client }) => {
  const getTitle = () => {
    switch (lang) {
      case "en":
        return "Archived";
      case "es":
        return "Archivado";
      case "pt":
        return "Arquivado";
      default:
        return "Archivado";
    }
  };

  return (
    <SimpleTooltip content={getTitle()}>
      <div className="p-1 text-white rounded px-1.5 ml-1.5 select-none whitespace-nowrap cursor-help border-2 border-[#bfbfbf] bg-[#585858]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-auto"
          viewBox="0 0 16 16"
        >
          <path
            fill="currentColor"
            d="M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5V5a1 1 0 0 1-1-1zm2 3v7.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V5zm13-3H1v2h14zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"
          />
        </svg>
      </div>
    </SimpleTooltip>
  );
};

export default Archived;
