import { CardCatalogue } from "@/components/card-catalogue";

export default function Home() {
  return (
    <main className="container mx-auto min-h-screen px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold tracking-tight md:text-3xl">
        Pokémon TCG Catalogue
      </h1>
      <CardCatalogue />
    </main>
  );
}
