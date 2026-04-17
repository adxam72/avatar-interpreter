import logo from "@/assets/zehn-logo.png";

export const Footer = () => {
  return (
    <footer className="border-t border-primary/5 bg-gradient-to-b from-background to-primary-soft/30 mt-20">
      <div className="container py-12 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <img src={logo} alt="Zehn AI" className="h-10 w-auto mb-4" />
          <p className="text-sm text-muted-foreground max-w-md">
            Zehn AI — kar va zaif eshituvchi insonlarni butun dunyo bilan bog'lovchi
            zamonaviy sun'iy intellekt platforma. Imo-ishora — barchaning tili.
          </p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">Funksiyalar</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Studio (matn → ishora)</li>
            <li>Aniqlash (ishora → matn)</li>
            <li>Muloqot</li>
            <li>ZehnTube</li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3 text-sm">Loyiha</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Biz haqimizda</li>
            <li>Yordam</li>
            <li>Maxfiylik</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary/5 py-6">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Zehn AI. Barcha huquqlar himoyalangan.</p>
          <p>Eshitish chegarasini buzamiz 🤟</p>
        </div>
      </div>
    </footer>
  );
};
