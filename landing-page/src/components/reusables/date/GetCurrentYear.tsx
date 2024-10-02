import React, { useState, useEffect } from "react";

interface Props {
  lang?: string;
}

const CurrentYear: React.FC<Props> = ({ lang }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    CurrentYear;
    return () => clearInterval(intervalId);
  }, []);

  const unixTimestamp = currentDateTime.getTime();

  const fullDate = currentDateTime.toLocaleDateString(lang, {
    year: "numeric",
  });

  return (
    <p
      data-timestamp={unixTimestamp}
      title={fullDate}
      className="jb-bold text-lg mobile-only:text-base select-none cursor-help"
    >
      &nbsp;{fullDate}
    </p>
  );
};

export default CurrentYear;
