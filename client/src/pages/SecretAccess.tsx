import { useState } from "react";
import { useParams, Link } from "react-router";

export default function SecretAccess() {
  const { shortId } = useParams();
  const [password, setPassword] = useState("");
  const [secretText, setSecretText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);

  // Handle form submission to retrieve the secret.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:8000/secrets/${shortId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      // If the secret is password-protected and a password is required
      if (data.passwordRequired) {
        setPasswordRequired(true);
      } else if (data.error) {
        setError(data.error);
      } else if (data.secretText) {
        // Once the secret is retrieved, set it and hide the password form.
        setSecretText(data.secretText);
      }
    } catch (err) {
      console.error("Error retrieving secret:", err);
      setError("Failed to retrieve secret");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 to-blue-500 flex flex-col justify-center items-center text-white">
      <div className="w-full max-w-xl bg-gray-800 rounded-xl shadow-xl p-8 text-white">
        <h1 className="text-3xl font-bold text-center mb-6">Access Secret</h1>
        {!secretText && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {passwordRequired && (
              <div>
                <label htmlFor="password" className="block text-lg font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 font-semibold py-4 rounded-lg transition"
            >
              {isLoading
                ? "Loading..."
                : passwordRequired
                ? "Submit Password"
                : "Access Secret"}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 text-center text-red-400 font-medium">
            {error}
          </div>
        )}
        {secretText && (
          <>
            <div className="mt-6 p-6 bg-gray-700 rounded-md shadow">
              <h2 className="text-xl font-semibold mb-3">Your Secret</h2>
              <pre className="whitespace-pre-wrap text-white">{secretText}</pre>
            </div>
            <div className="flex justify-around mt-8">
              <Link
                to="/"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
              >
                Homepage
              </Link>
              <Link
                to="/share"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition"
              >
                Encrypt Another Secret
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
