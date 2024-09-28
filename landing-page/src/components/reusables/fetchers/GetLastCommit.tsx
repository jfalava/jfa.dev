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
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      {commitLink ? (
        <a
          href={commitLink.match(/\((.*?)\)/)?.[1] || "#"}
          target="_blank"
          rel="noopener noreferrer"
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
