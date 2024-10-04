import React from "react";

export enum TechnologyType {
  Astro = "Astro",
  React = "React",
  PowerShell = "PowerShell",
  Sh = "Sh",
  Cloudflare_Workers = "Cloudflare_Workers",
  Cloudflare_Pages = "Cloudflare_Pages",
  Cloudflare_D1 = "Cloudflare_D1",
  TypeScript = "TypeScript",
  Rust = "Rust",
  JSON = "JSON",
}

interface Props {
  t: TechnologyType;
}

const TechTag: React.FC<Props> = ({ t }) => {
  return (
    <>
      {t === TechnologyType.Astro && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#8344ca] bg-[#4e178b]"
          title="Astro"
        >
          <div className="">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-auto "
              viewBox="0 0 24 24"
            >
              <path
                fill="white"
                d="M8.358 20.162c-1.186-1.07-1.532-3.316-1.038-4.944c.856 1.026 2.043 1.352 3.272 1.535c1.897.283 3.76.177 5.522-.678c.202-.098.388-.229.608-.36c.166.473.209.95.151 1.437c-.14 1.185-.738 2.1-1.688 2.794c-.38.277-.782.525-1.175.787c-1.205.804-1.531 1.747-1.078 3.119l.044.148a3.16 3.16 0 0 1-1.407-1.188a3.3 3.3 0 0 1-.544-1.815c-.004-.32-.004-.642-.048-.958c-.106-.769-.472-1.113-1.161-1.133c-.707-.02-1.267.411-1.415 1.09c-.012.053-.028.104-.045.165zm-5.961-4.445s3.24-1.575 6.49-1.575l2.451-7.565c.092-.366.36-.614.662-.614s.57.248.662.614l2.45 7.565c3.85 0 6.491 1.575 6.491 1.575L16.088.727C15.93.285 15.663 0 15.303 0H8.697c-.36 0-.615.285-.784.727z"
              />
            </svg>
          </div>
        </div>
      )}
      {t === TechnologyType.React && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#3e9dbc] bg-[#087ea4]"
          title="React"
        >
          <div className="">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-auto "
              viewBox="0 0 24 24"
            >
              <path
                fill="white"
                d="M12 10.11c1.03 0 1.87.84 1.87 1.89c0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7c-.52-.59-1.03-1.23-1.51-1.9a23 23 0 0 1-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86c.27.06.57.11.88.16zm6.54-.76l.81-1.5l-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9s-1.17 0-1.71.03c-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47c.54.03 1.11.03 1.71.03s1.17 0 1.71-.03c.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7c.52.59 1.03 1.23 1.51 1.9c.82.08 1.63.2 2.4.36c.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86c-.27-.06-.57-.11-.88-.16zm1.45-7.05c1.47.84 1.63 3.05 1.01 5.63c2.54.75 4.37 1.99 4.37 3.68s-1.83 2.93-4.37 3.68c.62 2.58.46 4.79-1.01 5.63c-1.46.84-3.45-.12-5.37-1.95c-1.92 1.83-3.91 2.79-5.38 1.95c-1.46-.84-1.62-3.05-1-5.63c-2.54-.75-4.37-1.99-4.37-3.68s1.83-2.93 4.37-3.68c-.62-2.58-.46-4.79 1-5.63c1.47-.84 3.46.12 5.38 1.95c1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26c2.1-.63 3.28-1.53 3.28-2.26s-1.18-1.63-3.28-2.26c-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26c-2.1.63-3.28 1.53-3.28 2.26s1.18 1.63 3.28 2.26c.25-.76.55-1.51.89-2.26m9 2.26l-.3.51c.31-.05.61-.1.88-.16c-.07-.28-.18-.57-.29-.86zm-2.89 4.04c1.59 1.5 2.97 2.08 3.59 1.7c.64-.35.83-1.82.32-3.96c-.77.16-1.58.28-2.4.36c-.48.67-.99 1.31-1.51 1.9M8.08 9.74l.3-.51c-.31.05-.61.1-.88.16c.07.28.18.57.29.86zm2.89-4.04C9.38 4.2 8 3.62 7.37 4c-.63.35-.82 1.82-.31 3.96a23 23 0 0 1 2.4-.36c.48-.67.99-1.31 1.51-1.9"
              />
            </svg>
          </div>
        </div>
      )}
      {t === TechnologyType.PowerShell && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#3c67a2] bg-[#002353]"
          title="PowerShell"
        >
          <div className="">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-auto"
              viewBox="0 0 24 24"
            >
              <path
                fill="white"
                d="M21.83 4c.49 0 .8.4.67.89l-3.16 14.22c-.11.49-.59.89-1.08.89H2.17c-.49 0-.8-.4-.67-.89L4.66 4.89C4.77 4.4 5.25 4 5.74 4zm-6 12h-4c-.46 0-.83.38-.83.84c0 .47.37.85.83.85h4c.47 0 .85-.38.85-.85c0-.46-.38-.84-.85-.84m-10.05.28a.87.87 0 0 0-.21 1.22c.28.42.84.5 1.24.23c7.35-5.17 7.4-5.23 7.45-5.26c.18-.16.27-.38.28-.6c.01-.2-.04-.37-.16-.56L9.46 6.03A.867.867 0 0 0 8.21 6c-.36.32-.38.88-.05 1.24l4.15 4.44z"
              />
            </svg>
          </div>
        </div>
      )}
      {t === TechnologyType.Sh && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#7ff683] bg-[#199b1d]"
          title="Shell"
        >
          <div className="">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-auto"
              viewBox="0 0 24 24"
            >
              <path
                fill="white"
                d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm0-2h16V8H4zm3.5-1l-1.4-1.4L8.675 13l-2.6-2.6L7.5 9l4 4zm4.5 0v-2h6v2z"
              />
            </svg>
          </div>
        </div>
      )}
      {t === TechnologyType.Cloudflare_Workers && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#f49b4e] bg-[#f6821f]"
          title="Cloudflare Workers"
        >
          <svg
            className="h-5 w-auto invert"
            aria-label="Cloudflare Pages"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            aria-hidden="false"
            focusable="false"
          >
            <path d="M7.125 2.5l-.65 1H3v9h2.9l-.175 1H2.5L2 13V3l.5-.5h4.625zm3.15 0H13.5l.5.5v10l-.5.5H8.875l.65-1H13v-9h-2.9l.175-1z" />
            <path d="M7.15 9.5h-2.9l-.425-.775 5.2-8 .9.375L8.85 6.5h2.9l.425.775-5.2 8-.9-.375L7.15 9.5zM3.725 4.575a.35.35 0 100-.7.35.35 0 000 .7zM4.65 4.575a.35.35 0 100-.7.35.35 0 000 .7zM5.575 4.575a.35.35 0 100-.7.35.35 0 000 .7z" />
          </svg>
        </div>
      )}
      {t === TechnologyType.Cloudflare_Pages && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#f49b4e] bg-[#f6821f]"
          title="Cloudflare Pages"
        >
          <svg
            aria-label="Cloudflare Workers"
            className="h-5 w-auto invert"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            aria-hidden="false"
            focusable="false"
          >
            <path d="M6.21 12.293l-3.215-4.3 3.197-4.178-.617-.842-3.603 4.712-.005.603 3.62 4.847.623-.842z" />
            <path d="M7.332 1.988H6.095l4.462 6.1-4.357 5.9h1.245L11.8 8.09 7.332 1.988z" />
            <path d="M9.725 1.988H8.472l4.533 6.027-4.533 5.973h1.255l4.303-5.67v-.603L9.725 1.988z" />
          </svg>
        </div>
      )}
      {t === TechnologyType.Cloudflare_D1 && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#f49b4e] bg-[#f6821f]"
          title="Cloudflare D1"
        >
          <div className="">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 65 64"
              className="h-5 w-auto"
              data-icon="d1"
            >
              <path
                fill="white"
                d="m23.6 22.2 3.03 1.75v3.5L23.6 29.2l-3.03-1.75v-3.5zM20.06 49l3.54-3.54L27.14 49l-3.54 3.54zm3.54-14.7c.593 0 1.17.176 1.67.506.493.33.878.798 1.1 1.35a3 3 0 0 1-.65 3.27c-.42.42-.954.705-1.54.821a3 3 0 0 1-1.73-.171 3.04 3.04 0 0 1-1.35-1.1 3 3 0 0 1-.506-1.67c0-.796.316-1.56.879-2.12a3 3 0 0 1 2.12-.879zM10.3 11.2l6.42-4.89 1.21-.37h29l1.19.39 6.61 4.89.82 1.61v38L55 52.21l-4.83 5.11-1.46.63h-31.7l-1.37-.54-5.48-5.11-.64-1.47v-38zm3.21 25.4 4.47 4.94h.056v4h-1.83l-2.7-3v7.39l4.26 4h30l3.7-3.91V42.3l-3.67 3.24h-18.6v-4h17.2l5.19-4.61v-7.44l-3.67 3.25h-18.7v-4h17.2l5.19-4.6v-6.92l-3.67 3.26h-31.6l-2.74-2.8v6.12l4.47 4.94h.056v4h-1.83l-2.7-3zm32.7-26.7h-27.6l-4.07 3.11 3.4 3.48h28.4l4-3.56z"
              />
            </svg>
          </div>
        </div>
      )}
      {t === TechnologyType.TypeScript && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#579ae1] bg-[#2f74c0]"
          title="TypeScript"
        >
          <div className="">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-auto"
              viewBox="0 0 128 128"
            >
              <path
                fill="white"
                d="M2 63.91v62.5h125v-125H2zm100.73-5a15.56 15.56 0 0 1 7.82 4.5a20.6 20.6 0 0 1 3 4c0 .16-5.4 3.81-8.69 5.85c-.12.08-.6-.44-1.13-1.23a7.09 7.09 0 0 0-5.87-3.53c-3.79-.26-6.23 1.73-6.21 5a4.6 4.6 0 0 0 .54 2.34c.83 1.73 2.38 2.76 7.24 4.86c8.95 3.85 12.78 6.39 15.16 10c2.66 4 3.25 10.46 1.45 15.24c-2 5.2-6.9 8.73-13.83 9.9a38.3 38.3 0 0 1-9.52-.1A23 23 0 0 1 80 109.19c-1.15-1.27-3.39-4.58-3.25-4.82a9 9 0 0 1 1.15-.73l4.6-2.64l3.59-2.08l.75 1.11a16.8 16.8 0 0 0 4.74 4.54c4 2.1 9.46 1.81 12.16-.62a5.43 5.43 0 0 0 .69-6.92c-1-1.39-3-2.56-8.59-5c-6.45-2.78-9.23-4.5-11.77-7.24a16.5 16.5 0 0 1-3.43-6.25a25 25 0 0 1-.22-8c1.33-6.23 6-10.58 12.82-11.87a31.7 31.7 0 0 1 9.49.26zm-29.34 5.24v5.12H57.16v46.23H45.65V69.26H29.38v-5a49 49 0 0 1 .14-5.16c.06-.08 10-.12 22-.1h21.81z"
              />
            </svg>
          </div>
        </div>
      )}
      {t === TechnologyType.Rust && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#de6651] bg-[#e43717]"
          title="Rust"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-auto invert"
            viewBox="0 0 256 256"
          >
            <path d="m254.251 124.862l-10.747-6.653a146 146 0 0 0-.306-3.13l9.236-8.615a3.69 3.69 0 0 0 1.105-3.427a3.69 3.69 0 0 0-2.33-2.744l-11.807-4.415a137 137 0 0 0-.925-3.048l7.365-10.229a3.698 3.698 0 0 0-2.407-5.814l-12.45-2.025c-.484-.944-.988-1.874-1.496-2.796l5.231-11.483a3.68 3.68 0 0 0-.288-3.59a3.68 3.68 0 0 0-3.204-1.642l-12.636.44a100 100 0 0 0-1.996-2.421l2.904-12.308a3.7 3.7 0 0 0-.986-3.466a3.7 3.7 0 0 0-3.464-.986l-12.305 2.901a106 106 0 0 0-2.426-1.996l.442-12.635a3.68 3.68 0 0 0-1.64-3.205a3.69 3.69 0 0 0-3.59-.29l-11.48 5.234a133 133 0 0 0-2.796-1.5l-2.03-12.452a3.7 3.7 0 0 0-5.812-2.407l-10.236 7.365q-1.51-.481-3.042-.922L155.72 4.794a3.69 3.69 0 0 0-2.745-2.336a3.71 3.71 0 0 0-3.424 1.106l-8.615 9.243a111 111 0 0 0-3.13-.306l-6.653-10.75a3.698 3.698 0 0 0-6.289 0l-6.653 10.75a110 110 0 0 0-3.133.306l-8.617-9.243a3.695 3.695 0 0 0-6.169 1.23l-4.414 11.809c-1.023.293-2.035.604-3.045.922L82.599 10.16a3.69 3.69 0 0 0-3.579-.415a3.7 3.7 0 0 0-2.235 2.822l-2.03 12.452c-.94.487-1.869.988-2.796 1.5l-11.481-5.235a3.69 3.69 0 0 0-3.588.291a3.68 3.68 0 0 0-1.642 3.205l.44 12.635a118 118 0 0 0-2.426 1.996l-12.305-2.9a3.71 3.71 0 0 0-3.466.985a3.7 3.7 0 0 0-.986 3.466l2.899 12.308q-1.01 1.196-1.991 2.421l-12.636-.44a3.72 3.72 0 0 0-3.204 1.641a3.7 3.7 0 0 0-.291 3.59l5.234 11.484c-.509.922-1.012 1.852-1.5 2.796l-12.449 2.025a3.7 3.7 0 0 0-2.407 5.814l7.365 10.23q-.482 1.514-.925 3.047l-11.808 4.415a3.702 3.702 0 0 0-1.225 6.171l9.237 8.614c-.115 1.04-.217 2.087-.305 3.131L1.75 124.862A3.7 3.7 0 0 0 0 128.007c0 1.284.663 2.473 1.751 3.143l10.748 6.653q.132 1.572.305 3.131l-9.238 8.617a3.697 3.697 0 0 0 1.226 6.169l11.808 4.415c.294 1.022.605 2.037.925 3.047l-7.365 10.231a3.696 3.696 0 0 0 2.41 5.812l12.447 2.025c.487.944.986 1.874 1.5 2.8l-5.235 11.48a3.69 3.69 0 0 0 .291 3.59a3.68 3.68 0 0 0 3.204 1.641l12.63-.442c.659.821 1.322 1.626 1.997 2.426l-2.899 12.31a3.68 3.68 0 0 0 .986 3.459a3.68 3.68 0 0 0 3.466.983l12.305-2.898c.8.68 1.61 1.34 2.427 1.99l-.44 12.639a3.694 3.694 0 0 0 5.229 3.492l11.481-5.231a106 106 0 0 0 2.796 1.499l2.03 12.445a3.69 3.69 0 0 0 2.235 2.825a3.7 3.7 0 0 0 3.579-.413l10.229-7.37c1.01.32 2.025.633 3.047.927l4.415 11.804a3.69 3.69 0 0 0 2.744 2.331a3.68 3.68 0 0 0 3.425-1.106l8.617-9.238c1.04.12 2.086.22 3.133.313l6.653 10.748a3.7 3.7 0 0 0 3.143 1.75a3.7 3.7 0 0 0 3.145-1.75l6.653-10.748c1.047-.093 2.092-.193 3.131-.313l8.615 9.238a3.68 3.68 0 0 0 3.424 1.106a3.69 3.69 0 0 0 2.744-2.331l4.415-11.804c1.022-.294 2.038-.607 3.048-.927l10.231 7.37a3.7 3.7 0 0 0 5.812-2.412l2.03-12.445c.939-.487 1.868-.993 2.795-1.5l11.481 5.232a3.692 3.692 0 0 0 5.23-3.492l-.44-12.638a99 99 0 0 0 2.423-1.991l12.306 2.898c1.25.294 2.56-.07 3.463-.983a3.68 3.68 0 0 0 .986-3.459l-2.898-12.31c.675-.8 1.34-1.605 1.99-2.426l12.636.442a3.68 3.68 0 0 0 3.204-1.64a3.69 3.69 0 0 0 .289-3.592l-5.232-11.478c.511-.927 1.013-1.857 1.497-2.8l12.45-2.026a3.68 3.68 0 0 0 2.822-2.236a3.7 3.7 0 0 0-.415-3.576l-7.365-10.23q.479-1.516.925-3.048l11.806-4.415a3.68 3.68 0 0 0 2.331-2.745a3.68 3.68 0 0 0-1.106-3.424l-9.235-8.617c.112-1.04.215-2.086.305-3.13l10.748-6.654a3.69 3.69 0 0 0 1.751-3.143c0-1.281-.66-2.472-1.749-3.145m-71.932 89.156c-4.104-.885-6.714-4.93-5.833-9.047c.878-4.112 4.92-6.729 9.023-5.844c4.104.879 6.718 4.931 5.838 9.04c-.88 4.11-4.926 6.73-9.028 5.851m-3.652-24.699a6.93 6.93 0 0 0-8.23 5.332l-3.816 17.807c-11.775 5.344-24.85 8.313-38.621 8.313c-14.086 0-27.446-3.116-39.43-8.688l-3.814-17.806c-.802-3.747-4.486-6.134-8.228-5.33l-15.72 3.376a93 93 0 0 1-8.128-9.58h76.49c.865 0 1.442-.157 1.442-.945v-27.057c0-.787-.577-.944-1.443-.944H106.8v-17.15h24.195c2.208 0 11.809.63 14.878 12.902c.962 3.774 3.072 16.05 4.516 19.98c1.438 4.408 7.293 13.213 13.533 13.213h38.115c.433 0 .895-.049 1.382-.137a94 94 0 0 1-8.669 10.17zm-105.79 24.327c-4.105.886-8.146-1.731-9.029-5.843c-.878-4.119 1.732-8.162 5.836-9.047a7.607 7.607 0 0 1 9.028 5.85c.878 4.11-1.734 8.16-5.836 9.04M43.86 95.986c1.703 3.842-.03 8.345-3.867 10.045c-3.837 1.705-8.328-.03-10.03-3.875a7.615 7.615 0 0 1 3.867-10.045a7.6 7.6 0 0 1 10.03 3.874m-8.918 21.14l16.376-7.277a6.94 6.94 0 0 0 3.524-9.158l-3.372-7.626h13.264v59.788H37.973a93.7 93.7 0 0 1-3.566-25.672c0-3.398.183-6.756.535-10.056m71.862-5.807V93.696h31.586c1.632 0 11.52 1.886 11.52 9.28c0 6.139-7.584 8.34-13.821 8.34zm114.792 15.862q0 3.506-.257 6.948h-9.603c-.961 0-1.348.632-1.348 1.573v4.41c0 10.38-5.853 12.638-10.982 13.213c-4.884.55-10.3-2.045-10.967-5.034c-2.882-16.206-7.683-19.667-15.265-25.648c9.41-5.975 19.2-14.79 19.2-26.59c0-12.74-8.734-20.765-14.688-24.7c-8.352-5.506-17.6-6.61-20.095-6.61H58.279c13.467-15.03 31.719-25.677 52.362-29.551l11.706 12.28a6.923 6.923 0 0 0 9.799.226l13.098-12.528c27.445 5.11 50.682 22.194 64.073 45.633l-8.967 20.253c-1.548 3.505.032 7.604 3.527 9.157l17.264 7.668c.298 3.065.455 6.161.455 9.3M122.352 24.745c3.033-2.905 7.844-2.79 10.748.247c2.898 3.046 2.788 7.862-.252 10.765c-3.033 2.906-7.844 2.793-10.748-.25a7.62 7.62 0 0 1 .252-10.762m88.983 71.61a7.594 7.594 0 0 1 10.028-3.872c3.838 1.702 5.57 6.203 3.867 10.045a7.595 7.595 0 0 1-10.03 3.875c-3.833-1.703-5.565-6.2-3.865-10.048" />
          </svg>
        </div>
      )}
      {t === TechnologyType.JSON && (
        <div
          className="flex items-center flex-wrap p-1 rounded px-1.5 ml-1.5 select-none cursor-help border-2 border-[#a3a3a3] bg-[#757575]"
          title="JSON"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-auto"
            viewBox="0 0 256 256"
          >
            <defs>
              <linearGradient
                id="logosJson0"
                x1="15.791%"
                x2="91.009%"
                y1="14.737%"
                y2="85.228%"
              >
                <stop offset="0%" />
                <stop offset="100%" stopColor="#fff" />
              </linearGradient>
              <linearGradient
                id="logosJson1"
                x1="82.136%"
                x2="-3.113%"
                y1="85.237%"
                y2="14.79%"
              >
                <stop offset="0%" />
                <stop offset="100%" stopColor="#fff" />
              </linearGradient>
            </defs>
            <path
              fill="url(#logosJson0)"
              d="M127.783 190.56c56.637 77.208 112.064-21.55 111.982-80.94C239.67 39.404 168.5.16 127.737.16C62.309.159 0 54.232 0 128.216C0 210.45 71.425 256 127.737 256c-12.743-1.835-55.21-10.934-55.78-108.747c-.385-66.154 21.58-92.585 55.688-80.958c.764.283 37.622 14.823 37.622 62.32c0 47.296-37.484 61.944-37.484 61.944"
            />
            <path
              fill="url(#logosJson1)"
              d="M127.717 66.241c-37.424-12.899-83.269 17.946-83.269 79.726C44.448 246.844 119.201 256 128.263 256C193.691 256 256 201.926 256 127.943C256 45.709 184.575.159 128.263.159c15.597-2.16 84.065 16.88 84.065 110.458c0 61.026-51.124 94.248-84.376 80.054c-.764-.283-37.623-14.823-37.623-62.32c0-47.297 37.388-62.11 37.388-62.11"
            />
          </svg>
        </div>
      )}
    </>
  );
};

export default TechTag;
