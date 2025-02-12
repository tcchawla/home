import { useState } from "react";
import { useParams, Link } from "react-router";

export default function SecretAccess() {
  const { shortId } = useParams();

  const [password, setPassword] = useState("");
  const [secretText, setSecretText] = useState("");
  const [remainingTime, setRemainingTime] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // New states for retrieving extended secret via email.
  const [extendedEmail, setExtendedEmail] = useState("");
  const [extendedSecret, setExtendedSecret] = useState("");
  const [extendedRemaining, setExtendedRemaining] = useState("");
  const [extendedError, setExtendedError] = useState("");

  // Primary retrieval form by password.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setIsExpired(false);
    setSecretText("");
    setRemainingTime("");
    setExtendedSecret("");
    try {
      const response = await fetch(`http://localhost:8000/secrets/${shortId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        // If status 410 then secret (normal access) is expired.
        if (response.status === 410) {
          setIsExpired(true);
          setError(data.error || "Secret has expired");
        } else {
          setError(data.error || "Failed to retrieve secret");
        }
        return;
      }

      const data = await response.json();
      if (data.passwordRequired) {
        setPasswordRequired(true);
      } else if (data.secretText) {
        setSecretText(data.secretText);
        setRemainingTime(data.remainingTime);
      }
    } catch (err) {
      console.error("Error retrieving secret:", err);
      setError("Failed to retrieve secret");
    } finally {
      setIsLoading(false);
    }
  };

  // New function to retrieve extended secret using an email.
  const handleRetrieveExtendedSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtendedError("");
    setExtendedSecret("");
    setExtendedRemaining("");
    try {
      const response = await fetch(
        `http://localhost:8000/secrets/${shortId}/extended`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: extendedEmail }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setExtendedError(data.error || "Failed to retrieve extended secret");
      } else {
        setExtendedSecret(data.secretText);
        setExtendedRemaining(data.remainingTime);
      }
    } catch (err) {
      console.error("Error retrieving extended secret:", err);
      setExtendedError("Failed to retrieve extended secret");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 to-blue-500 flex flex-col justify-center items-center text-white">
      <div className="w-full max-w-xl bg-gray-800 rounded-xl shadow-xl p-8 text-white">
        <h1 className="text-3xl font-bold text-center mb-6">Access Secret</h1>

        {/* Normal retrieval form */}
        {!secretText && !extendedSecret && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {passwordRequired && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-lg font-medium mb-2"
                >
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

        {/* If the normal retrieval shows the secret */}
        {!isExpired && secretText && (
          <>
            <div className="mt-6 p-6 bg-gray-700 rounded-md shadow">
              <h2 className="text-xl font-semibold mb-3">Your Secret</h2>
              <pre className="whitespace-pre-wrap text-white">{secretText}</pre>
            </div>
            <div className="mt-4 text-center text-gray-400">
              <p>{remainingTime}</p>
            </div>
          </>
        )}

        {/* If normal retrieval indicates expiration, show extended retrieval form */}
        {isExpired && !extendedSecret && (
          <div className="mt-6 p-6 bg-gray-700 rounded-md shadow">
            <h2 className="text-xl font-semibold mb-3">
              Retrieve Extended Secret
            </h2>
            <form onSubmit={handleRetrieveExtendedSecret} className="space-y-4">
              <label htmlFor="extendedEmail" className="block text-lg mb-2">
                Enter Email for Extended Access:
              </label>
              <input
                id="extendedEmail"
                type="email"
                value={extendedEmail}
                onChange={(e) => setExtendedEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
                className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 font-semibold py-4 rounded-lg transition"
              >
                Retrieve Extended Secret
              </button>
            </form>
            {extendedError && (
              <div className="mt-4 text-center text-red-400">
                {extendedError}
              </div>
            )}
          </div>
        )}

        {/* If extended secret is retrieved */}
        {extendedSecret && (
          <>
            <div className="mt-6 p-6 bg-gray-700 rounded-md shadow">
              <h2 className="text-xl font-semibold mb-3">
                Your Extended Secret
              </h2>
              <pre className="whitespace-pre-wrap text-white">
                {extendedSecret}
              </pre>
            </div>
            <div className="mt-4 text-center text-gray-400">
              <p>{extendedRemaining}</p>
            </div>
          </>
        )}

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
      </div>
    </div>
  );
}
