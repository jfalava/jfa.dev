import React, { useState, useEffect } from "react";
interface LastCommitProps {
  b: string;
  token?: string;
}

const LastCommit: React.FC<LastCommitProps> = ({ b, token }) => {
  const [commitLink, setCommitLink] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLastCommit = async () => {
      const url = `https://api.github.com/repos/jfalava/jfa.dev/commits?sha=${b}`;

      try {
        const headers: HeadersInit = {
          Accept: "application/vnd.github.v3+json",
        };

        // Conditionally add the Authorization header if token is provided
        if (token) {
          headers.Authorization = `token ${token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`Failed to fetch commits: ${response.statusText}`);
        }

        const commits = await response.json();
        const lastCommit = commits[0];
        const shortHash = lastCommit.sha.substring(0, 7); // Extract the short hash
        const commitUrl = lastCommit.html_url; // Get the commit URL

        setCommitLink(`[${shortHash}](${commitUrl})`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchLastCommit();
  }, [b, token]);

  if (loading) {
    return (
      <div className="flex items-center dark:invert">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-auto w-6 dark:invert"
          viewBox="0 0 24 24"
        >
          <circle cx="4" cy="12" r="3" fill="currentColor">
            <animate
              id="svgSpinners3DotsFade0"
              fill="freeze"
              attributeName="opacity"
              begin="0;svgSpinners3DotsFade1.end-0.25s"
              dur="0.75s"
              values="1;0.2"
            />
          </circle>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4">
            <animate
              fill="freeze"
              attributeName="opacity"
              begin="svgSpinners3DotsFade0.begin+0.15s"
              dur="0.75s"
              values="1;0.2"
            />
          </circle>
          <circle cx="20" cy="12" r="3" fill="currentColor" opacity="0.3">
            <animate
              id="svgSpinners3DotsFade1"
              fill="freeze"
              attributeName="opacity"
              begin="svgSpinners3DotsFade0.begin+0.3s"
              dur="0.75s"
              values="1;0.2"
            />
          </circle>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center">
        <p className="mobile-only:text-sm bold">Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      {commitLink ? (
        <a
          href={commitLink.match(/\((.*?)\)/)?.[1] || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="bold"
        >
          {commitLink.match(/\[(.*?)\]/)?.[1] || "Commit"}
        </a>
      ) : (
        <p>No commit found</p>
      )}
    </div>
  );
};

export default LastCommit;
