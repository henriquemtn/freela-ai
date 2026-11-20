-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "websiteStatus" "WebsiteStatus",
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);


-- Default first-contact templates (editable in the app).
INSERT INTO "MessageTemplate" (id, name, "websiteStatus", "updatedAt", body) VALUES
('tpl_no_site_offer', 'Sem site: oferecer prévia', 'not_found', now(), $$Oi, {nome}, tudo bem? Aqui é o [seu nome], sou desenvolvedor aqui de {cidade}.

Estava pesquisando {categoria} na região e encontrei vocês. Reparei que vocês ainda não têm um site próprio, e hoje muita gente pesquisa no Google antes de escolher onde ir.

Posso montar uma prévia rápida de como ficaria um site simples pra {empresa}, focado em levar quem pesquisa direto pro WhatsApp de vocês? Sem custo e sem compromisso.

Se não fizer sentido agora, sem problema!$$),
('tpl_no_site_ready', 'Sem site: prévia pronta', NULL, now(), $$Oi, {nome}, tudo bem? Aqui é o [seu nome], sou desenvolvedor aqui de {cidade}.

Estava pesquisando {categoria} na região e encontrei vocês. Como vocês ainda não têm um site próprio, montei uma prévia rápida de como ficaria um site pra {empresa}, focado em levar quem pesquisa no Google direto pro WhatsApp de vocês.

Posso te mandar o link pra dar uma olhada? Se não fizer sentido agora, sem problema!$$),
('tpl_social_only', 'Só Instagram', 'social_only', now(), $$Oi, {nome}, tudo bem? Aqui é o [seu nome], sou desenvolvedor aqui de {cidade}.

Encontrei vocês pesquisando {categoria} na região e dei uma olhada no perfil ({link}). Hoje o contato de vocês fica concentrado no Instagram, e quem pesquisa no Google não encontra um site com serviços, endereço e horários.

Posso montar uma prévia rápida de um site simples pra {empresa}, ligado ao WhatsApp e ao Instagram de vocês? Sem custo e sem compromisso.

Se não fizer sentido agora, sem problema!$$),
('tpl_outdated', 'Site desatualizado', 'outdated', now(), $$Oi, {nome}, tudo bem? Aqui é o [seu nome], sou desenvolvedor aqui de {cidade}.

Encontrei o site de vocês ({link}) pesquisando {categoria} na região. Notei alguns pontos que dá pra melhorar, principalmente no celular, que é de onde vem a maior parte das buscas.

Posso te mandar uma prévia de como ele poderia ficar, mais rápido e com contato direto pelo WhatsApp? Sem compromisso.

Se não fizer sentido agora, sem problema!$$);
