import { CreditCard, Users, Settings, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import cashlessLogo from "/lovable-uploads/5d1243b4-484d-4634-b7a8-1a57e94242be.png";
import Footer from "@/components/shared/Footer";
const Login = () => {
  const navigate = useNavigate();
  const accessCards = [{
    title: "Agent",
    description: "Connexion pour les agents de recharge et de vente",
    icon: Users,
    color: "bg-primary",
    action: () => navigate("/agent/login"),
    buttonText: "Connexion Agent"
  }, {
    title: "Participant",
    description: "Accès à votre portefeuille numérique et historique",
    icon: Wallet,
    color: "bg-secondary",
    action: () => navigate("/participant/login"),
    buttonText: "Connexion Participant"
  }, {
    title: "Administrateur",
    description: "Accès au dashboard de gestion de la plateforme",
    icon: Settings,
    color: "bg-accent-foreground",
    action: () => navigate("/admin/login"),
    buttonText: "Connexion Admin"
  }];
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-primary to-primary/90 text-primary-foreground px-4 sm:py-0 py-[4px]">
        <div className="container mx-auto px-2 sm:px-6 text-center">
          <div className="flex justify-center mb-6">
            <img src={cashlessLogo} alt="Cashless Logo" className="h-16 sm:h-20 w-auto" />
          </div>
          <p className="text-primary-foreground/90 text-base sm:text-lg max-w-2xl mx-auto py-px my-[10px]">
            Portefeuille numérique des événements d'Eventime
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 sm:py-12 py-[8px]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-3 sm:mb-4">
              Choisissez votre type d'accès
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base px-4">
              Sélectionnez le type de compte correspondant à votre profil
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 justify-center max-w-4xl mx-auto">
            {accessCards.map((card, index) => {
            const IconComponent = card.icon;
            return <Card key={index} className="card-banking hover:shadow-lg transition-all duration-300">
                  <CardHeader className="text-center pb-2 sm:pb-3 px-3 sm:px-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 ${card.color} rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3`}>
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <CardTitle className="text-base sm:text-lg font-semibold">{card.title}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2 sm:pt-3 px-3 sm:px-4">
                    <Button onClick={card.action} className="w-full btn-primary text-xs sm:text-sm py-2 sm:py-2.5" size="sm">
                      {card.buttonText}
                    </Button>
                  </CardContent>
                </Card>;
          })}
          </div>
        </div>
      </main>

      <Footer />
    </div>;
};
export default Login;