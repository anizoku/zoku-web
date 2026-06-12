import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MascotGray } from "@/components/mascots/ZokuMascot";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <MascotGray size={100} mood="confused" />
        </div>

        <div>
          <h1 className="font-space font-bold text-7xl text-primary/30 mb-2">404</h1>
          <h2 className="font-space font-bold text-2xl text-foreground mb-2">Obra não encontrada</h2>
          <p className="text-muted-foreground">
            Parece que esta página sumiu como um personagem de isekai.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate("/")} className="gap-2">
            Voltar para o início
          </Button>
          <Button variant="outline" onClick={() => navigate("/animes")} className="gap-2">
            Explorar catálogo
          </Button>
        </div>
      </div>
    </div>
  );
}