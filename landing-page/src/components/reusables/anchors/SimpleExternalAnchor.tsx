import React from "react";

interface SimpleInlineAnchor {
  h: string;
  id?: string;
  children: React.ReactNode;
  c?: string;
}

export default function A({ h, id, children, c = "" }: SimpleInlineAnchor) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (e.ctrlKey || e.metaKey) {
      window.open(h, "_blank", "noopener,noreferer,me");
    } else {
      window.location.href = h;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key === "Enter") {
      handleClick(
        e as unknown as React.MouseEvent<HTMLAnchorElement, MouseEvent>,
      );
    }
  };

  return (
    <a
      id={id}
      href={h}
      className={c}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      role="link"
      tabIndex={0}
      aria-label={h}
      title={h}
      data-astro-prefetch="tap"
    >
      {children}
    </a>
  );
}
