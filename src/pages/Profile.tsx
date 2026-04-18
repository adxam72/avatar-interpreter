import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { SignAvatar } from "@/components/SignAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { User, Save, ExternalLink } from "lucide-react";

const PRESET_AVATARS = [
  { label: "Erkak (kostyum)", url: "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024" },
  { label: "Ayol", url: "https://models.readyplayer.me/64f1a8f9e7d2c4b1a0e8e1c2.glb?morphTargets=ARKit&textureAtlas=1024" },
  { label: "Yoshlar", url: "https://models.readyplayer.me/65a3a6a1d6dca8a1f4b2c3e1.glb?morphTargets=ARKit&textureAtlas=1024" },
];

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isDeaf, setIsDeaf] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
      setIsDeaf(!!profile.is_deaf);
    }
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, avatar_url: avatarUrl || null, is_deaf: isDeaf })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Saqlab bo'lmadi: " + error.message);
    else {
      toast.success("Profil yangilandi");
      refreshProfile();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary-deep text-xs font-medium mb-2">
            <User className="h-3 w-3" /> Profil
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Mening profilim</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Avatar, ism va sozlamalaringizni boshqaring.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Avatar preview */}
          <div className="glass-card rounded-3xl overflow-hidden aspect-square">
            <SignAvatar avatarUrl={avatarUrl || undefined} showControls compact />
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div>
                <Label>Ism familiya</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sizning ismingiz"
                  className="mt-1.5 rounded-2xl"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="mt-1.5 rounded-2xl bg-muted" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-primary-soft/40">
                <div>
                  <Label className="text-sm">Men kar yoki zaif eshituvchi</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Boshqa foydalanuvchilarga muloqot uslubi haqida ma'lumot beradi.
                  </p>
                </div>
                <Switch checked={isDeaf} onCheckedChange={setIsDeaf} />
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div>
                <Label>Avatar (.glb URL)</Label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://models.readyplayer.me/..."
                  className="mt-1.5 rounded-2xl font-mono text-xs"
                />
                <a
                  href="https://readyplayer.me/avatar"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 mt-2 hover:underline"
                >
                  Ready Player Me'da yangi avatar yarating
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Tayyor variantlar</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {PRESET_AVATARS.map((p) => (
                    <button
                      key={p.url}
                      onClick={() => setAvatarUrl(p.url)}
                      className={`p-3 rounded-2xl border-2 text-xs font-medium transition-smooth ${
                        avatarUrl === p.url
                          ? "border-primary bg-primary-soft"
                          : "border-transparent bg-muted hover:bg-primary-soft/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={save} variant="hero" size="lg" disabled={saving} className="w-full">
              <Save className="h-4 w-4" />
              {saving ? "Saqlanmoqda…" : "Saqlash"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
