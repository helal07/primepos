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
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Save, KeyRound, User as UserIcon, Upload, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [profile, setProfile] = useState({
    display_name: "", phone: "", company: "", avatar_url: "",
    address: "", id_proof_url: "", id_proof_name: "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone, company, avatar_url, address, id_proof_url, id_proof_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile({
        display_name: data.display_name ?? "",
        phone: data.phone ?? "",
        company: data.company ?? "",
        avatar_url: data.avatar_url ?? "",
        address: (data as any).address ?? "",
        id_proof_url: (data as any).id_proof_url ?? "",
        id_proof_name: (data as any).id_proof_name ?? "",
      });
    })();
  }, [user]);

  const initials = (profile.display_name || user?.email || "??")
    .split(" ").map(s => s[0]).join("").toUpperCase().slice(0, 2);

  const persistProfile = async (patch: Partial<typeof profile>) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    const next = { ...profile, ...patch };
    setProfile(next);
    const payload = { ...next, user_id: user.id };
    return existing
      ? supabase.from("profiles").update(payload).eq("user_id", user.id)
      : supabase.from("profiles").insert(payload);
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploadingAvatar(false); return toast.error(upErr.message); }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const res = await persistProfile({ avatar_url: publicUrl });
    setUploadingAvatar(false);
    if (res?.error) toast.error(res.error.message);
    else toast.success("Avatar updated");
    e.target.value = "";
  };

  const onDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("File must be under 10MB");
    setUploadingDoc(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/id-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("user-documents")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploadingDoc(false); return toast.error(upErr.message); }
    const res = await persistProfile({ id_proof_url: path, id_proof_name: file.name });
    setUploadingDoc(false);
    if (res?.error) toast.error(res.error.message);
    else toast.success("Document uploaded");
    e.target.value = "";
  };

  const removeDoc = async () => {
    if (!profile.id_proof_url) return;
    await supabase.storage.from("user-documents").remove([profile.id_proof_url]);
    const res = await persistProfile({ id_proof_url: "", id_proof_name: "" });
    if (res?.error) toast.error(res.error.message);
    else toast.success("Document removed");
  };

  const viewDoc = async () => {
    if (!profile.id_proof_url) return;
    const { data, error } = await supabase.storage.from("user-documents")
      .createSignedUrl(profile.id_proof_url, 60);
    if (error || !data) return toast.error("Could not open document");
    window.open(data.signedUrl, "_blank");
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const res = await persistProfile({});
    setLoading(false);
    if (res?.error) toast.error(res.error.message);
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
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 p-6">
          <div className="relative">
            <Avatar className="h-24 w-24">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-90 shadow-md">
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <input id="avatar-upload" type="file" accept="image/*" className="hidden"
                onChange={onAvatarChange} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{profile.display_name || "Unnamed"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">Click the upload icon to change your photo (max 5MB)</p>
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
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" rows={3} placeholder="Street, City, State, Country"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>ID Proof / Document</Label>
                  {profile.id_proof_url ? (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <button type="button" onClick={viewDoc}
                        className="flex-1 text-left text-sm font-medium hover:underline truncate">
                        {profile.id_proof_name || "View document"}
                      </button>
                      <Button type="button" variant="ghost" size="icon" onClick={removeDoc}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="doc-upload"
                      className="flex items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground cursor-pointer hover:bg-muted/30">
                      {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>{uploadingDoc ? "Uploading..." : "Upload ID proof or document (PDF/Image, max 10MB)"}</span>
                      <input id="doc-upload" type="file" className="hidden"
                        accept="image/*,application/pdf"
                        onChange={onDocChange} disabled={uploadingDoc} />
                    </label>
                  )}
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