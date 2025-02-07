// client/src/components/SecretSharingForm.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router";

export default function SecretSharingForm() {
  const [secretText, setSecretText] = useState("");
  const [expiresDays, setExpiresDays] = useState(7);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shortUrl, setShortUrl] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:8000/secrets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secretText,
          expiresDays,
          password
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create secret");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setShortUrl(data.shortUrl || "");
      setSecretText("");
      setPassword("");
      setExpiresDays(7);

      // Automatically navigate to the secret access page
      navigate(`/share/${data.shortUrl.split('/share/').pop()}`);

    } catch (error) {
      console.error("Error creating secret:", error);
      alert("Failed to create secret");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Share a Secret</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Secret Text</label>
          <textarea
            value={secretText}
            onChange={(e) => setSecretText(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter your secret here..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Expiration (days)</label>
          <input
            type="number"
            value={expiresDays}
            onChange={(e) => setExpiresDays(Number(e.target.value))}
            className="w-full p-2 border rounded"
            min="1"
            max="365"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password (optional)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isSubmitting ? "Creating..." : "Create Secret"}
        </button>
      </form>

      {shortUrl && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Short URL:</h2>
          <p className="word-break">{shortUrl}</p>
        </div>
      )}
    </div>
  );
}
