import { useState } from "react";
import { HeartSwitch } from "@anatoliygatt/heart-switch";

export default function SecretSharingForm() {
  const [secretText, setSecretText] = useState("");
  const [expiresDays, setExpiresDays] = useState(7);
  const [expiresMinutes, setExpiresMinutes] = useState(0);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shortUrl, setShortUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [email, setEmail] = useState("");
  const [checked, setChecked] = useState(false);

  // Handles form submission: sends a POST request to create a new secret.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:8000/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secretText,
          expiresDays,
          expiresMinutes,
          password,
          checked,
          email,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create secret");
      }

      console.log(email);
      const data = await response.json();
      setShortUrl(data.shortUrl);

      // Reset form fields on success.
      setSecretText("");
      setPassword("");
      setExpiresDays(7);
      setExpiresMinutes(0);
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
            <label
              htmlFor="secretText"
              className="block text-lg font-medium mb-2"
            >
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

          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="expiresDays"
                className="block text-lg font-medium mb-2"
              >
                Expiration (days)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="expiresDays"
                  type="number"
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(Number(e.target.value))}
                  max="365"
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-gray-400">days</span>
              </div>
            </div>
            <div className="flex-1">
              <label
                htmlFor="expiresMinutes"
                className="block text-lg font-medium mb-2"
              >
                Expiration (minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="expiresMinutes"
                  type="number"
                  value={expiresMinutes}
                  onChange={(e) => setExpiresMinutes(Number(e.target.value))}
                  min="1"
                  max="1439"
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">minutes</span>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-lg font-medium mb-2"
            >
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
          <HeartSwitch
            aria-label="Extendable"
            size="sm"
            inactiveTrackFillColor="#cffafe"
            inactiveTrackStrokeColor="#22d3ee"
            activeTrackFillColor="#06b6d4"
            activeTrackStrokeColor="#0891b2"
            inactiveThumbColor="#ecfeff"
            activeThumbColor="#ecfeff"
            checked={checked}
            onChange={(event) => {
              setChecked(event.target.checked);
            }}
          />
          {checked && (
            <div>
              <label htmlFor="email" className="block text-lg font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Please give an email"
                className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

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
