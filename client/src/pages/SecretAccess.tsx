import { useState } from "react";
import { useParams, Link } from "react-router";
// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

/**
 * SecretAccess Component
 *
 * - Allows users to access a shared secret via its short URL.
 * - Prompts for a password if the secret is password-protected.
 * - Displays the secret along with navigation buttons to return home or encrypt another secret.
 */
export default function SecretAccess() {
  const { shortId } = useParams();
  const [password, setPassword] = useState("");
  const [secretText, setSecretText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:8000/secrets/${shortId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }
      );
      const data = await response.json();

      if (data.passwordRequired) {
        setPasswordRequired(true);
      } else if (data.error) {
        setError(data.error);
      } else if (data.secretText) {
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
    <div className="min-h-screen flex flex-col items-center py-10 bg-gradient-to-br from-green-200 to-blue-200">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Access Secret</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {passwordRequired && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1"
                  required
                />
              </div>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading
                ? "Loading..."
                : passwordRequired
                ? "Submit Password"
                : "Access Secret"}
            </Button>
          </form>
          {error && (
            <div className="mt-4 text-center text-destructive font-medium">
              {error}
            </div>
          )}
          {secretText && (
            <div className="mt-6 p-4 bg-muted rounded-md shadow">
              <h2 className="text-xl font-semibold mb-3">Your Secret</h2>
              <pre className="whitespace-pre-wrap text-sm">{secretText}</pre>
            </div>
          )}
        </CardContent>
        {secretText && (
          <CardFooter className="flex justify-around mt-6">
            <Link to="/">
              <Button variant="outline">Homepage</Button>
            </Link>
            <Link to="/share">
              <Button>Encrypt Another Secret</Button>
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
