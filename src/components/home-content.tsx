"use client";

import { useState } from "react";
import { ClawMachine } from "@/components/claw-machine";
import { CardCatalogue } from "@/components/card-catalogue";
import { Spinner } from "@/components/spinner";

export function HomeContent() {
  const [clawReady, setClawReady] = useState(false);
  const [catalogueReady, setCatalogueReady] = useState(false);

  const loading = !clawReady || !catalogueReady;

  return (
    <>
      {loading && <Spinner />}
      <main
        className={`container mx-auto min-h-screen px-4 py-8 transition-opacity duration-300 ${
          loading ? "invisible" : "opacity-100"
        }`}
      >
        <ClawMachine onReady={() => setClawReady(true)} />
        <section>
          <h2 className="mb-6 text-center text-xl font-bold tracking-tight md:text-2xl">
            Loaded in the Machine
          </h2>
          <CardCatalogue onReady={() => setCatalogueReady(true)} />
        </section>
      </main>
    </>
  );
}
