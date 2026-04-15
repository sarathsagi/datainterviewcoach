"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

interface ProfileSectionProps {
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
}

export function ProfileSection({ name, email, emailVerified }: ProfileSectionProps) {
  const router = useRouter();
  const [newName, setNewName] = useState(name);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setMessage("");

    if (newName.trim() === name) return;

    setLoading(true);
    try {
      const res = await fetch("/api/account/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setMessage("Profile updated successfully");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-300">Name</Label>
          <Input
            id="name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={100}
            className="border-slate-700 bg-slate-800 text-white max-w-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">Email</Label>
          <div className="flex items-center gap-2">
            <Input
              value={email}
              disabled
              className="border-slate-700 bg-slate-800/50 text-slate-400 max-w-sm"
            />
            {emailVerified && (
              <Badge variant="secondary" className="bg-green-950 text-green-400 border-green-800 shrink-0">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        {message && (
          <p className="text-sm text-green-400">{message}</p>
        )}

        <Button
          onClick={handleSave}
          disabled={loading || newName.trim() === name}
          className="bg-indigo-600 hover:bg-indigo-500"
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
