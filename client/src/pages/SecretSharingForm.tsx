import { useState } from "react";
// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

/**
 * SecretSharingForm Component
 *
 * - Renders a form for creating a new secret share.
 * - Sends the secret details to the backend and shows the generated short URL.
 * - Provides actionable buttons to copy or open the generated URL.
 */
export default function SecretSharingForm() {
  const [secretText, setSecretText] = useState("");
  const [expiresDays, setExpiresDays] = useState(7);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shortUrl, setShortUrl] = useState("");

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

      // Reset form fields upon success
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      alert("Short URL copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Failed to copy URL");
    }
  };

  const handleOpenLink = () => {
    window.open(shortUrl, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Share Your Secret</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="secretText">Secret Text</Label>
              <Textarea
                id="secretText"
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                placeholder="Enter your secret here..."
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="expiresDays">Expiration (days)</Label>
              <Input
                id="expiresDays"
                type="number"
                value={expiresDays}
                onChange={(e) => setExpiresDays(Number(e.target.value))}
                min="1"
                max="365"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password (optional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set an optional password"
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Creating Secret..." : "Create Secret"}
            </Button>
          </form>
        </CardContent>
        {shortUrl && (
          <CardFooter className="flex flex-col items-center space-y-4 mt-8">
            <div className="text-xl font-semibold">Your Short URL</div>
            <div className="text-blue-600 break-all">{shortUrl}</div>
            <div className="flex space-x-4">
              <Button variant="secondary" onClick={handleCopy}>
                Copy
              </Button>
              <Button variant="outline" onClick={handleOpenLink}>
                Open Link
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
