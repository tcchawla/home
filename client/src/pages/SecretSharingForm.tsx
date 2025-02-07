import { useState } from "react";

export default function SecretSharingForm() {
  const [secretText, setSecretText] = useState("");
  const [expiresDays, setExpiresDays] = useState(7);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shortUrl, setShortUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  // Handles form submission: sends a POST request to create a new secret.
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

      // Reset form fields on success.
      setSecretText("");
      setPassword("");
      setExpiresDays(7);
    } catch (error) {
      console.error("Error creating secret:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopyMessage("Copied to clipboard!");
      setTimeout(() => setCopyMessage(""), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleOpenLink = () => {
    window.open(shortUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 to-blue-500 flex flex-col justify-center items-center text-white">
      <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-xl p-8 text-white">
        <h1 className="text-3xl font-bold text-center mb-6">
          Share Your Secret
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="secretText" className="block text-lg font-medium mb-2">
              Secret Text
            </label>
            <textarea
              id="secretText"
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              placeholder="Enter your secret here..."
              className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>

          <div>
            <label htmlFor="expiresDays" className="block text-lg font-medium mb-2">
              Expiration (days)
            </label>
            <input
              id="expiresDays"
              type="number"
              value={expiresDays}
              onChange={(e) => setExpiresDays(Number(e.target.value))}
              min="1"
              max="365"
              className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-lg font-medium mb-2">
              Password (optional)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set an optional password"
              className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 font-semibold py-4 rounded-lg transition disabled:bg-gray-500"
          >
            {isSubmitting ? "Creating Secret..." : "Create Secret"}
          </button>
        </form>

        {shortUrl && (
          <div className="mt-8 p-6 bg-gray-700 rounded-lg shadow text-center">
            <h2 className="text-xl font-semibold mb-4">Your Short URL</h2>
            <p className="break-all text-blue-400 mb-4">{shortUrl}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleCopy}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-md transition"
              >
                Copy
              </button>
              <button
                onClick={handleOpenLink}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md transition"
              >
                Open Link
              </button>
            </div>
            {copyMessage && (
              <div className="mt-2 text-green-400 text-sm">{copyMessage}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
