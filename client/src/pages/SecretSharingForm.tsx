import { useState } from "react";
import { useNavigate } from "react-router";

/**
 * SecretSharingForm Component
 * - Renders a form that allows the user to input secret text,
 *   expiration (in days), and an optional password.
 * - After submitting, it displays the generated short URL along with:
 *    - a "Copy" button to copy the URL to the clipboard and
 *    - an "Open Link" button that opens the URL in a new tab.
 */
export default function SecretSharingForm() {
  const [secretText, setSecretText] = useState("");
  const [expiresDays, setExpiresDays] = useState(7);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shortUrl, setShortUrl] = useState("");
  const navigate = useNavigate();

  /**
   * Handles form submission by sending a POST request to the
   * backend and retrieving the short URL for the secret.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:8000/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretText, expiresDays, password }),
      });

      if (!response.ok) {
        throw new Error("Failed to create secret");
      }
      const data = await response.json();
      setShortUrl(data.shortUrl);

      // Reset form fields
      setSecretText("");
      setPassword("");
      setExpiresDays(7);
    } catch (error) {
      console.error("Error creating secret:", error);
      alert("Failed to create secret");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Copies the short URL to the user's clipboard.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      alert("Copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Failed to copy");
    }
  };

  /**
   * Opens the short URL in a new browser tab.
   */
  const handleOpenLink = () => {
    window.open(shortUrl, "_blank");
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold text-center mb-6">
        Share a Secret
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Secret Text Input */}
        <div>
          <label className="block text-lg font-medium mb-1">
            Secret Text
          </label>
          <textarea
            value={secretText}
            onChange={(e) => setSecretText(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your secret here..."
            rows={4}
            required
          />
        </div>

        {/* Expiration (Days) Input */}
        <div>
          <label className="block text-lg font-medium mb-1">
            Expiration (days)
          </label>
          <input
            type="number"
            value={expiresDays}
            onChange={(e) => setExpiresDays(Number(e.target.value))}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="365"
            required
          />
        </div>

        {/* Optional Password Input */}
        <div>
          <label className="block text-lg font-medium mb-1">
            Password (optional)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Set an optional password"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition disabled:bg-gray-400"
        >
          {isSubmitting ? "Creating..." : "Create Secret"}
        </button>
      </form>

      {/* Display generated short URL and action buttons */}
      {shortUrl && (
        <div className="mt-8 p-6 bg-gray-100 rounded-lg shadow-md flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-4">Short URL:</h2>
          <p className="text-blue-600 break-all mb-4">{shortUrl}</p>
          <div className="flex space-x-4">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md transition"
            >
              Copy
            </button>
            <button
              onClick={handleOpenLink}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition"
            >
              Open Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
