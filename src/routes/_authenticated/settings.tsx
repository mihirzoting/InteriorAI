import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { STYLES } from "@/lib/catalog";
import { useUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Profile & settings — InteriorAI" },
      { name: "description", content: "Manage your profile and default design preferences." },
      { property: "og:title", content: "Profile & settings — InteriorAI" },
      { property: "og:description", content: "Manage your profile and default design preferences." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { user } = useUser();
  const [name, setName] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.display_name ?? "");
      setStyle(data?.default_style ?? null);
      setBudget(data?.default_budget?.toString() ?? "");
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: name,
      default_style: style,
      default_budget: budget ? Number(budget) : null,
      updated_at: new Date().toISOString(),
    });
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  return (
    <>
      <PageHeader eyebrow="Account" title="Profile & settings" />
      <div className="max-w-xl space-y-6">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dn">Display name</Label>
          <Input id="dn" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Default style</Label>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={cn("rounded-full border px-4 py-1.5 text-sm", style === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="db">Default budget ($)</Label>
          <Input id="db" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <Button className="rounded-md" onClick={save}>Save changes</Button>
      </div>
    </>
  );
}
