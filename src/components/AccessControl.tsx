import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";

interface AccessControlProps {
  children: React.ReactNode;
  requirePremium?: boolean;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
  onUpgrade?: () => void;
}

export function AccessControl({ 
  children, 
  requirePremium = false, 
  requireAuth = false,
  fallback,
  onUpgrade
}: AccessControlProps) {
  const { isAuthenticated, isPremium, loading } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"auth" | "premium">("auth");

  if (loading) return null;

  const handleAccess = (e: React.MouseEvent) => {
    if (requireAuth && !isAuthenticated) {
      e.preventDefault();
      e.stopPropagation();
      setModalType("auth");
      setShowModal(true);
      return;
    }

    if (requirePremium && !isPremium) {
      e.preventDefault();
      e.stopPropagation();
      setModalType("premium");
      setShowModal(true);
      return;
    }
  };

  const isBlocked = (requireAuth && !isAuthenticated) || (requirePremium && !isPremium);

  if (isBlocked && fallback) {
    return <div onClick={handleAccess}>{fallback}</div>;
  }

  return (
    <>
      <div onClickCapture={handleAccess} className={isBlocked ? "cursor-pointer" : ""}>
        {children}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-[#0B0F19] text-white border-white/10 sm:max-w-[400px]">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {modalType === "auth" ? (
                <Lock className="h-6 w-6 text-primary" />
              ) : (
                <Crown className="h-6 w-6 text-yellow-500" />
              )}
            </div>
            <DialogTitle className="text-center text-xl">
              {modalType === "auth" ? "Acesso Restrito" : "Recurso Premium"}
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-400 pt-2">
              {modalType === "auth" 
                ? "Para acessar este recurso, faça login ou crie sua conta gratuitamente!"
                : "Este recurso é exclusivo para assinantes Abastece+ Pro. Faça o upgrade agora por apenas R$ 9,90/mês!"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setShowModal(false)}
              className="flex-1 text-zinc-400 hover:text-white hover:bg-white/5"
            >
              Depois
            </Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={() => {
                setShowModal(false);
                if (modalType === "auth") {
                  navigate({ to: "/login" });
                } else {
                  if (onUpgrade) onUpgrade();
                }
              }}
            >
              {modalType === "auth" ? "Fazer Login" : "Assinar Agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
