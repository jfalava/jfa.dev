import React from "react";
import SimpleTooltip from "@/components/reusables/text-elements/SimpleTooltip.tsx";
interface Props {
  lang: string;
}

const OnHold: React.FC<Props> = ({ lang }) => {
  const getTitle = () => {
    switch (lang) {
      case "en":
        return "On hold";
      case "es":
        return "En espera";
      case "pt":
        return "Em espera";
      default:
        return "En espera";
    }
  };

  return (
    <SimpleTooltip content={getTitle()}>
      <p className="jetbrains p-1 text-white text-nowrap text-sm rounded px-1.5 ml-1.5 select-none whitespace-nowrap cursor-help border-2 border-[#9297f6] bg-[#555dfe]">
        {getTitle()}
      </p>
    </SimpleTooltip>
  );
};

export default OnHold;
