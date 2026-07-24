import { createClient } from "@/lib/supabase/server";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("solde_du", { ascending: false });

  return <ClientsClient clients={clients ?? []} />;
}
