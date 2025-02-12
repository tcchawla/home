import { useState, useEffect } from "react";
import { Link } from "react-router";

export default function ExtendExpiry() {
  const [expiredRecords, setExpiredRecords] = useState<any[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [expiresDays, setExpiresDays] = useState(0);
  const [expiresMinutes, setExpiresMinutes] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpiredRecords = async () => {
    try {
      const response = await fetch("http://localhost:8000/admin/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (response.ok) {
        setExpiredRecords(data.expiredEmails);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch expired records");
    }
  };

  useEffect(() => {
    fetchExpiredRecords();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");
    const record = expiredRecords.find(
      (r) => r.emailRecordId === selectedRecordId
    );
    if (!record) {
      setError("No record selected");
      setIsSubmitting(false);
      return;
    }
    try {
      const response = await fetch("http://localhost:8000/admin/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: record.email,
          secretId: record.secret_id,
          expiresDays,
          expiresMinutes,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to extend");
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to process extension");
    } finally {
      setIsSubmitting(false);
      fetchExpiredRecords();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 to-blue-500 flex flex-col justify-center items-center text-white">
      <div className="w-full max-w-3xl bg-gray-800 rounded-xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6">
          Admin: Extend Expired Secrets
        </h1>
        {error && <div className="text-red-400 text-center mb-4">{error}</div>}
        {message && (
          <div className="text-green-400 text-center mb-4">{message}</div>
        )}
        <div className="mb-6">
          <h2 className="text-2xl mb-4">Expired Secrets</h2>
          {expiredRecords.length === 0 ? (
            <p>No expired records found.</p>
          ) : (
            <table className="min-w-full border">
              <thead>
                <tr>
                  <th className="border px-4 py-2">Short ID</th>
                  <th className="border px-4 py-2">Email</th>
                  <th className="border px-4 py-2">Expiration</th>
                </tr>
              </thead>
              <tbody>
                {expiredRecords.map((record) => (
                  <tr key={record.emailRecordId}>
                    <td className="border px-4 py-2">{record.shortId}</td>
                    <td className="border px-4 py-2">{record.email}</td>
                    <td className="border px-4 py-2">
                      {record.expiresAtHuman}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mb-6">
          <label className="block text-lg mb-2">Select Secret to Extend:</label>
          <select
            value={selectedRecordId}
            onChange={(e) => setSelectedRecordId(e.target.value)}
            className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg"
          >
            <option value="">-- Select an expired secret --</option>
            {expiredRecords.map((record) => (
              <option key={record.emailRecordId} value={record.emailRecordId}>
                {`${record.shortId} | ${record.email} | ${record.expiresAtHuman}`}
              </option>
            ))}
          </select>
        </div>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-lg mb-2">Extend by Days</label>
              <input
                type="number"
                value={expiresDays}
                onChange={(e) => setExpiresDays(Number(e.target.value))}
                min="0"
                max="365"
                required
                className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <label className="block text-lg mb-2">Extend by Minutes</label>
              <input
                type="number"
                value={expiresMinutes}
                onChange={(e) => setExpiresMinutes(Number(e.target.value))}
                min="0"
                max="1439"
                required
                className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !selectedRecordId}
            className="w-full bg-blue-600 hover:bg-blue-700 font-semibold py-4 rounded-lg transition"
          >
            {isSubmitting ? "Processing..." : "Extend Selected Secret"}
          </button>
        </form>
        <div className="flex justify-center mt-6">
          <Link
            to="/"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
          >
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
