import { Link } from "react-router";

/**
 * HomePage Component
 * Renders the landing page with navigation to the secret sharing feature.
 */
function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-400 to-blue-500 flex flex-col justify-center items-center text-white">
      <h1 className="text-4xl font-bold mb-6">
        Welcome to the Secret Sharing App
      </h1>
      <div className="space-x-4">
        <Link
          to="/share"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition"
        >
          Share a Secret
        </Link>
        <Link
          to="/access"
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition"
        >
          Access a Secret
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
