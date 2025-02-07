// client/src/components/SecretAccess.tsx
import { useState } from "react";
import { useParams } from "react-router";
import { Link, useNavigate } from "react-router";

export default function SecretAccess() {
  const { shortId } = useParams();
  const [password, setPassword] = useState("");
  const [secretText, setSecretText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`http://localhost:8000/secrets/${shortId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Failed to retrieve secret");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.passwordRequired) {
        setHasPassword(true);
        return;
      }

      setSecretText(data.secretText || "");
    } catch (error) {
      console.error("Error retrieving secret:", error);
      setError(error instanceof Error ? error.message : "Failed to retrieve secret");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Access Secret</h1>

      <div className="max-w-md mx-auto">
        {hasPassword && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              This secret is password protected. Please enter the password to access it.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasPassword && (
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? "Accessing..." : hasPassword ? "Submit Password" : "Access Secret"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {secretText && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h2 className="text-lg font-semibold mb-2">Secret:</h2>
            <p className="whitespace-pre-wrap">{secretText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
