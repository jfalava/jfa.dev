import React from "react";
// SimpleTooltip
import SimpleTooltip from "@/components/reusables/text-elements/SimpleTooltip.tsx";
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
    <SimpleTooltip content={getTitle()}>
      <div className="jetbrains p-1 text-white text-nowrap text-sm rounded px-1.5 ml-1.5 select-none whitespace-nowrap cursor-help border-2 border-[#f45a5a] bg-[#f71616]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-auto"
          viewBox="0 0 32 32"
        >
          <path
            fill="currentColor"
            d="M2.113 12.684A2.95 2.95 0 0 0 1 14.998c0 .625.196 1.305.659 1.872c.365.45.833.762 1.341.933V29a2 2 0 0 0 2 2h23a2 2 0 0 0 2-2V17.83a2.9 2.9 0 0 0 1.298-.913a2.92 2.92 0 0 0 .682-1.89a2.95 2.95 0 0 0-1.115-2.305l-6.203-4.976a2.7 2.7 0 0 0-1.597-.61l-.417-.336a2.44 2.44 0 0 0-.831-1.34l-.015-.012l-3.334-2.674a3 3 0 0 0-.537-.386a2.975 2.975 0 0 0-3.587.498l-2.781 2.228A2.52 2.52 0 0 0 9.489 4a2.56 2.56 0 0 0-2.022-1h-.924A2.54 2.54 0 0 0 4 5.54v5.632zM6 12.133V5.54c0-.3.241-.54.543-.54h.924c.292 0 .543.24.543.54V6h1.457a.535.535 0 0 1 .533.54v2.388zm10.471-5.9L28 15.467v4.337q0-.15-.03-.3l-.004-.017l-.197-.905a1.544 1.544 0 0 0-1.818-1.2l-1.683.358a2.5 2.5 0 0 0-1.773-.74a2.5 2.5 0 0 0-2.335 1.617l-1.927.411a1.544 1.544 0 0 0-1.203 1.82l.004.016l.197.905a1.544 1.544 0 0 0 1.818 1.2l.951-.202V23h5v-1.3l1.767-.377A1.54 1.54 0 0 0 28 19.815V29H14.617a.385.385 0 0 0 .383-.393V27h.5a1.5 1.5 0 0 0 1.247-2.335A1 1 0 0 0 17 24v-2a1 1 0 0 0-1-1h-1v-.466A3.503 3.503 0 0 0 11.505 17C9.568 17 8 18.58 8 20.534V21H7a1 1 0 0 0-1 1v2c0 .256.096.489.253.665A1.5 1.5 0 0 0 7.5 27H8v1.607c0 .22.166.39.383.393H5V15.404l2.13-1.706c.17-.14.23-.36.19-.57v-.04c0-.14.07-.3.2-.4l2.08-1.66c.11-.09.3-.07.46-.02c.19.06.41.03.57-.1zM7 22h9v2H7zm8.5 4h-8a.5.5 0 0 1 0-1h8a.5.5 0 0 1 0 1m11.063-5.656l-7.71 1.645a.544.544 0 0 1-.644-.426l-.198-.912a.544.544 0 0 1 .426-.644l7.71-1.645a.544.544 0 0 1 .644.426l.198.912a.544.544 0 0 1-.426.644"
          />
        </svg>
      </div>
    </SimpleTooltip>
  );
};

export default Abandoned;
