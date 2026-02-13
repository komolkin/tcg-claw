import { ClawMachine } from "@/components/claw-machine";
import { CardCatalogue } from "@/components/card-catalogue";

export default function Home() {
  return (
    <main className="container mx-auto min-h-screen px-4 py-8">
      <ClawMachine />
      <section>
        <h2 className="mb-6 text-center text-xl font-bold tracking-tight md:text-2xl">
          Loaded in the Machine
        </h2>
        <CardCatalogue />
      </section>
    </main>
  );
}
