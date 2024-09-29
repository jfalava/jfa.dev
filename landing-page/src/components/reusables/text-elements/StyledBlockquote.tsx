import React from "react";

export enum BlockquoteType {
  Info = "info",
  Tip = "tip",
  Warning = "warning",
  Danger = "danger",
  Important = "important",
  Updated = "updated",
  Language = "lang",
}

interface Props {
  blockquoteType: BlockquoteType;
  children: React.ReactNode;
}

const StyledBlockquote: React.FC<Props> = ({ blockquoteType, children }) => {
  return (
    <blockquote
      className={`mt-[1%] mb-[1%] ml-[7%] border-l-2 ${
        blockquoteType === BlockquoteType.Info
          ? "border-blue-500"
          : blockquoteType === BlockquoteType.Tip
            ? "border-green-500"
            : blockquoteType === BlockquoteType.Warning
              ? "border-yellow-500"
              : blockquoteType === BlockquoteType.Danger
                ? "border-red-500"
                : blockquoteType === BlockquoteType.Language
                  ? "border-indigo-500"
                  : blockquoteType === BlockquoteType.Updated
                    ? "border-teal-400"
                    : "border-[#181a1b]"
      } p-2 mobile-only:p-1 flex flex-wrap items-center`}
    >
      {blockquoteType === BlockquoteType.Info && (
        <div className="text-blue-500 inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-auto"
            viewBox="0 0 48 48"
          >
            <g fill="none">
              <path
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="4"
                d="M24 44a19.94 19.94 0 0 0 14.142-5.858A19.94 19.94 0 0 0 44 24a19.94 19.94 0 0 0-5.858-14.142A19.94 19.94 0 0 0 24 4A19.94 19.94 0 0 0 9.858 9.858A19.94 19.94 0 0 0 4 24a19.94 19.94 0 0 0 5.858 14.142A19.94 19.94 0 0 0 24 44Z"
              />
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M24 11a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5"
                clipRule="evenodd"
              />
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
                d="M24.5 34V20h-2M21 34h7"
              />
            </g>
          </svg>
        </div>
      )}

      {blockquoteType === BlockquoteType.Tip && (
        <div className="text-green-500 inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-auto"
            viewBox="0 0 24 24"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            >
              <path d="M5.143 14A7.8 7.8 0 0 1 4 9.919C4 5.545 7.582 2 12 2s8 3.545 8 7.919A7.8 7.8 0 0 1 18.857 14" />
              <path d="M14 10c-.613.643-1.289 1-2 1s-1.387-.357-2-1m-2.617 7.098c-.092-.276-.138-.415-.133-.527a.6.6 0 0 1 .382-.53c.104-.041.25-.041.54-.041h7.656c.291 0 .436 0 .54.04a.6.6 0 0 1 .382.531c.005.112-.041.25-.133.527c-.17.511-.255.767-.386.974a2 2 0 0 1-1.2.869c-.238.059-.506.059-1.043.059h-3.976c-.537 0-.806 0-1.043-.06a2 2 0 0 1-1.2-.868c-.131-.207-.216-.463-.386-.974M15 19l-.13.647c-.14.707-.211 1.06-.37 1.34a2 2 0 0 1-1.113.912C13.082 22 12.72 22 12 22s-1.082 0-1.387-.1a2 2 0 0 1-1.113-.913c-.159-.28-.23-.633-.37-1.34L9 19m3-3.5V11" />
            </g>
          </svg>
        </div>
      )}

      {blockquoteType === BlockquoteType.Warning && (
        <div className="text-yellow-500 inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-auto"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M1 21L12 2l11 19zm3.45-2h15.1L12 6zM12 18q.425 0 .713-.288T13 17t-.288-.712T12 16t-.712.288T11 17t.288.713T12 18m-1-3h2v-5h-2zm1-2.5"
            />
          </svg>
        </div>
      )}

      {blockquoteType === BlockquoteType.Danger && (
        <div className="text-red-500 inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-auto"
            viewBox="0 0 24 24"
          >
            <g fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
                d="M12 7v6"
              />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </g>
          </svg>
        </div>
      )}

      {blockquoteType === BlockquoteType.Important && (
        <div className="text-purple-500 inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-auto"
            viewBox="0 0 16 16"
            version="1.1"
            aria-hidden="true"
          >
            <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
        </div>
      )}

      {blockquoteType === BlockquoteType.Updated && (
        <div className="text-teal-500 inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-auto h-7"
            viewBox="0 0 32 32"
          >
            <path
              fill="currentColor"
              d="m27 25.586l-2-2V21h-2v3.414L25.586 27z"
            />
            <path
              fill="currentColor"
              d="M24 31a7 7 0 1 1 7-7a7.01 7.01 0 0 1-7 7m0-12a5 5 0 1 0 5 5a5.006 5.006 0 0 0-5-5m-8 9A12.013 12.013 0 0 1 4 16H2a14.016 14.016 0 0 0 14 14zM12 8H7.078A11.984 11.984 0 0 1 28 16h2A13.978 13.978 0 0 0 6 6.234V2H4v8h8z"
            />
          </svg>
        </div>
      )}

      {blockquoteType === BlockquoteType.Language && (
        <div className="text-indigo-500 inline-block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-auto h-7"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12.004 1.95a1 1 0 0 1 1.094-.896A10.94 10.94 0 0 1 18 2.78V2.5a1 1 0 1 1 2 0V5a1 1 0 0 1-1 1h-2.5a1 1 0 0 1-.29-1.957a8.9 8.9 0 0 0-3.31-.999a1 1 0 0 1-.896-1.093M6 21.5v-.279a10.94 10.94 0 0 0 4.9 1.725a1 1 0 1 0 .198-1.99a8.9 8.9 0 0 1-3.308-.999A1 1 0 0 0 7.5 18H5a1 1 0 0 0-1 1v2.5a1 1 0 1 0 2 0M16.952 8.303a1 1 0 1 0-1.905-.606a13 13 0 0 0-.324 1.343c-.565.013-1.12 0-1.652-.037a1 1 0 0 0-.143 1.995q.691.048 1.417.047a26 26 0 0 0-.24 1.697c-1.263.716-2.142 1.684-2.637 2.701c-.624 1.283-.7 2.856.24 3.882c.675.737 1.704.759 2.499.59c.322-.07.654-.177.988-.321a1 1 0 0 0 1.746-.93l-.041-.115a8.4 8.4 0 0 0 2.735-4.06c.285.251.507.549.658.864c.284.594.334 1.27.098 1.91c-.233.633-.78 1.313-1.839 1.843a1 1 0 1 0 .895 1.788c1.44-.72 2.385-1.757 2.82-2.94a4.44 4.44 0 0 0-.17-3.464a4.75 4.75 0 0 0-2.103-2.164A9 9 0 0 0 20 12a1 1 0 0 0-1.974-.23a6 6 0 0 0-1.796.138q.07-.457.166-.964a20 20 0 0 0 2.842-.473a1 1 0 1 0-.476-1.942c-.623.152-1.286.272-1.964.358c.047-.209.099-.409.154-.584m-3.685 8.015c.165-.34.414-.697.758-1.038q.03.521.098.973c.083.56.207 1.049.341 1.478a3.4 3.4 0 0 1-.674.227c-.43.091-.588.018-.614.006l-.004-.001c-.162-.194-.329-.774.095-1.645m4.498-2.563a6.36 6.36 0 0 1-1.568 2.73a8 8 0 0 1-.096-.524a10.3 10.3 0 0 1-.087-1.905l.1-.036zM3.08 5.621a6.34 6.34 0 0 1 4.456-.331h.003q.957.284 1.547.881c.394.398.624.852.755 1.29c.202.678.18 1.422.168 1.838q-.005.12-.005.201v5.503a1 1 0 0 1-1.96.282l-.08.039c-.964.462-2.397.92-3.877.507c-1.632-.457-2.453-1.81-2.572-3.136c-.114-1.28.41-2.736 1.682-3.448c1.529-.855 3.116-.839 4.262-.64q.295.051.555.116a2.5 2.5 0 0 0-.09-.689a1.05 1.05 0 0 0-.258-.454c-.121-.122-.325-.263-.69-.37a4.34 4.34 0 0 0-3.048.222a1 1 0 0 1-.848-1.811m4.037 4.956c-.884-.153-1.956-.137-2.943.416c-.424.237-.729.83-.667 1.523c.058.647.421 1.193 1.119 1.389c.79.22 1.681-.005 2.473-.385c.367-.176.68-.37.905-.523V10.8a6 6 0 0 0-.887-.222"
            ></path>
          </svg>
        </div>
      )}
      <div className="flex-1">{children}</div>
    </blockquote>
  );
};

export default StyledBlockquote;
