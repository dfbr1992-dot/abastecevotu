import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf-8")
    .split("\n")
    .filter(line => line.includes("="))
    .map(line => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim().replace(/^"|"$/g, "")];
    })
);

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function geocodeAddress(address) {
  const full = `${address}, Votuporanga, SP, Brasil`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(full)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "User-Agent": "AbasteceVotu/1.0" } });
  const data = await res.json();
  if (data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function main() {
  const { data: postos, error } = await supabase
    .from("postos")
    .select("id, nome, endereco")
    .is("lat", null);

  if (error) { console.error("Erro:", error); return; }
  console.log(`${postos.length} postos para geocodificar...`);

  for (const posto of postos) {
    console.log(`\nProcessando: ${posto.nome} — ${posto.endereco}`);
    const coords = await geocodeAddress(posto.endereco);
    if (!coords) {
      console.log(`??  Não encontrado`);
    } else {
      const { error: updateError } = await supabase
        .from("postos").update({ lat: coords.lat, lng: coords.lng }).eq("id", posto.id);
      if (updateError) console.log(`? Erro:`, updateError.message);
      else console.log(`? lat=${coords.lat}, lng=${coords.lng}`);
    }
    await new Promise(r => setTimeout(r, 1100));
  }
  console.log("\n? Concluído!");
}

main();
