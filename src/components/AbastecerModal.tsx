import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplets, Flame, Truck } from "lucide-react";
import { useAbastecimentos } from "@/hooks/use-abastecimentos";
import type { Vehicle } from "@/hooks/use-vehicle";

type FuelType = "etanol" | "gasolina" | "diesel";

const FUEL_OPTIONS: Array<{ value: FuelType; label: string; icon: React.ReactNode }> = [
  { value: "etanol", label: "Etanol", icon: <Droplets size={20} /> },
  { value: "gasolina", label: "Gasolina", icon: <Flame size={20} /> },
  { value: "diesel", label: "Diesel", icon: <Truck size={20} /> },
];

export default function AbastecerModal({
  open,
  onOpenChange,
  userId,
  vehicle,
  theme,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  vehicle: Vehicle | null;
  theme: string;
  onSuccess?: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    combustivel: "gasolina" as FuelType,
    data: new Date().toISOString().split("T")[0],
    litros: "",
    valor: "",
    km: "",
  });
  const [loading, setLoading] = useState(false);

  const { addAbastecimento } = useAbastecimentos(userId, vehicle?.id ?? null);

  const handleSubmit = async () => {
    if (!userId || !vehicle) return onSuccess?.("Faça login e registre um veículo primeiro");
    const litros = parseFloat(form.litros.replace(",", "."));
    const valor = parseFloat(form.valor.replace(",", "."));
    const km = parseInt(form.km, 10);
    if (!form.data || !litros || !valor || !km) return onSuccess?.("Preencha todos os campos");

    setLoading(true);
    try {
      await addAbastecimento({
        veiculo_id: vehicle.id,
        data: form.data,
        km_atual: km,
        litros,
        valor_total: valor,
        combustivel: form.combustivel,
      });
      onSuccess?.("Abastecimento registrado com sucesso!");
      onOpenChange(false);
      setForm({ combustivel: "gasolina", data: new Date().toISOString().split("T")[0], litros: "", valor: "", km: vehicle.km_atual?.toString() ?? "" });
    } catch {
      onSuccess?.("Erro ao registrar abastecimento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`rounded-[32px] border-none ${theme === "dark" ? "bg-[#0b0f19] text-white" : "bg-white text-zinc-900"}`}>
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Abastecer</DialogTitle>
            <DialogDescription className="opacity-60">
              {vehicle ? `${vehicle.marca} ${vehicle.modelo}` : "Registre um veículo na Garagem primeiro"}
            </DialogDescription>
          </DialogHeader>

          {/* Seletor de combustível */}
          <div className="grid grid-cols-3 gap-2 mt-6">
            {FUEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, combustivel: opt.value })}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-[11px] font-black uppercase tracking-wider transition-all ${
                  form.combustivel === opt.value
                    ? opt.value === "etanol"
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-500"
                      : opt.value === "diesel"
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-500"
                        : "border-blue-500/50 bg-blue-500/15 text-blue-500"
                    : theme === "dark"
                      ? "border-white/10 bg-white/5 opacity-50"
                      : "border-zinc-200 bg-zinc-50 opacity-50"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Field label="Data">
              <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className={theme === "dark" ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200"} />
            </Field>
            <Field label="KM Atual">
              <Input type="number" inputMode="numeric" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} placeholder={vehicle?.km_atual?.toString() ?? "45200"} className={theme === "dark" ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200"} />
            </Field>
            <Field label="Litros">
              <Input type="number" inputMode="decimal" value={form.litros} onChange={(e) => setForm({ ...form, litros: e.target.value })} placeholder="35.5" className={theme === "dark" ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200"} />
            </Field>
            <Field label="Valor Total (R$)">
              <Input type="number" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="180.50" className={theme === "dark" ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200"} />
            </Field>
          </div>

          <Button onClick={handleSubmit} disabled={loading || !vehicle} className="mt-6 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
            {loading ? "Salvando..." : "Salvar Abastecimento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold opacity-50">{label}</Label>
      {children}
    </div>
  );
}
