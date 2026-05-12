import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Save, KeyRound, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ display_name: "", phone: "", company: "", avatar_url: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone, company, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile({
        display_name: data.display_name ?? "",
        phone: data.phone ?? "",
        company: data.company ?? "",
        avatar_url: data.avatar_url ?? "",
      });
    })();
  }, [user]);

  const initials = (profile.display_name || user?.email || "??")
    .split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { data: existing } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    const payload = { ...profile, user_id: user.id };
    const { error } = existing
      ? await supabase.from("profiles").update(payload).eq("user_id", user.id)
      : await supabase.from("profiles").insert(payload);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords do not match");
    if (!user?.email) return;
    setLoading(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: pw.current,
    });
    if (signInErr) {
      setLoading(false);
      return toast.error("Current password is incorrect");
    }
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password changed");
      setPw({ current: "", next: "", confirm: "" });
    }
  };

  const PwField = ({ id, label, value, onChange, field }: any) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show[field as keyof typeof show] ? "text" : "password"} value={value} onChange={onChange} required />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShow(s => ({ ...s, [field]: !s[field as keyof typeof show] }))}>
          {show[field as keyof typeof show] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Manage your personal information and password" />

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-20 w-20">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{profile.display_name || "Unnamed"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile"><UserIcon className="h-4 w-4 mr-2" />Edit Profile</TabsTrigger>
          <TabsTrigger value="password"><KeyRound className="h-4 w-4 mr-2" />Change Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Full Name</Label>
                  <Input id="display_name" value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={profile.company}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input id="avatar_url" placeholder="https://..." value={profile.avatar_url}
                    onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-4 max-w-md">
                <PwField id="current" label="Current Password" field="current"
                  value={pw.current} onChange={(e: any) => setPw({ ...pw, current: e.target.value })} />
                <PwField id="next" label="New Password" field="next"
                  value={pw.next} onChange={(e: any) => setPw({ ...pw, next: e.target.value })} />
                <PwField id="confirm" label="Confirm New Password" field="confirm"
                  value={pw.confirm} onChange={(e: any) => setPw({ ...pw, confirm: e.target.value })} />
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    <KeyRound className="h-4 w-4 mr-2" />Update Password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}