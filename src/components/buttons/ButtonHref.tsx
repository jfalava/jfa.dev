import { createSignal } from "solid-js";
//

type ButtonProps = {
  url: string;
  label?: string;
};

//

export const ButtonHref = (props: ButtonProps) => {
  const [isClicked, setIsClicked] = createSignal(false);

  const handleClick = () => {
    setIsClicked(true);
  };

  if (isClicked()) {
    window.location.href = props.url;
  }

  return (
    <button onClick={handleClick}>
      {props.label || "Click Me"}
    </button>
  );
};
