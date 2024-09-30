import React, { useState, useEffect } from "react";

interface Props {
  lang?: string;
  c?: string;
}

const CompleteCurrentLocalTime: React.FC<Props> = ({ lang, c }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    CompleteCurrentLocalTime;
    return () => clearInterval(intervalId);
  }, []);

  const unixTimestamp = currentDateTime.getTime();

  const fullDate = currentDateTime.toLocaleDateString(lang, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const time = currentDateTime.toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="ml-2">
      <p
        data-timestamp={unixTimestamp}
        title={fullDate}
        className={`${c} select-none cursor-help contents`}
      >
        {fullDate}, {time}
      </p>
    </div>
  );
};

export default CompleteCurrentLocalTime;
