import { describe, expect, it } from "vitest";
import { outreachVars, pickTemplate, renderTemplate, shortName, whatsappUrl } from "./outreach";

const company = { name: "Leonardo Barbearia | Trindade", category: "Barbearia", city: "Florianópolis", websiteUrl: "https://www.instagram.com/leo/" };

describe("shortName", () => {
  it("drops location qualifiers", () => {
    expect(shortName("Leonardo Barbearia | Trindade")).toBe("Leonardo Barbearia");
    expect(shortName("Barbearia Pai e Filho - Jurerê Internacional")).toBe("Barbearia Pai e Filho");
    expect(shortName("Barbearia Vip (Santa Mônica)")).toBe("Barbearia Vip");
    expect(shortName("Auto-Center Silva")).toBe("Auto-Center Silva"); // hyphen inside a word is kept
  });
});

describe("outreachVars", () => {
  it("prefers the first name of a contact who did not opt out", () => {
    const v = outreachVars(company, [{ name: "Ana Souza", optedOut: true }, { name: "Leonardo Costa", optedOut: false }]);
    expect(v).toEqual({
      nome: "Leonardo", empresa: "Leonardo Barbearia", categoria: "barbearia", cidade: "Florianópolis", link: "instagram.com/leo",
      oportunidade: null, servico: null,
    });
  });

  it("takes opportunity and service from research, lowercasing the first letter", () => {
    const v = outreachVars(company, [], { opportunity: "Agendamento só por DM", service: "Agendamento online" });
    expect([v.oportunidade, v.servico]).toEqual(["agendamento só por DM", "agendamento online"]);
  });

  it("falls back to the company name", () => {
    expect(outreachVars(company, []).nome).toBe("Leonardo Barbearia");
  });
});

describe("renderTemplate", () => {
  it("fills known vars and reports missing ones, leaving unknown braces alone", () => {
    const r = renderTemplate("Oi, {nome}! {categoria} em {cidade}. {outro}", {
      nome: "Ana", empresa: "X", categoria: null, cidade: "Floripa", link: null, oportunidade: null, servico: null,
    });
    expect(r.text).toBe("Oi, Ana! {categoria} em Floripa. {outro}");
    expect(r.missing).toEqual(["categoria"]);
  });
});

describe("pickTemplate", () => {
  const t = [
    { id: "ready", websiteStatus: null },
    { id: "offer", websiteStatus: "not_found" as const },
    { id: "social", websiteStatus: "social_only" as const },
  ];
  it("matches presence, maps unknown to the no-website template, else first", () => {
    expect(pickTemplate(t, "social_only")?.id).toBe("social");
    expect(pickTemplate(t, "unknown")?.id).toBe("offer");
    expect(pickTemplate(t, "active")?.id).toBe("ready");
    expect(pickTemplate([], "active")).toBeUndefined();
  });
});

describe("whatsappUrl", () => {
  it("builds a wa.me link with the text encoded", () => {
    expect(whatsappUrl("(48) 99152-6450", "Oi, tudo bem?")).toBe("https://wa.me/5548991526450?text=Oi%2C%20tudo%20bem%3F");
    expect(whatsappUrl(null, "x")).toBeNull();
  });
});
