-- Default template personalized by research ({oportunidade}, {servico}). Editable in the app.
INSERT INTO "MessageTemplate" (id, name, "websiteStatus", "updatedAt", body) VALUES
('tpl_research', 'Personalizada pela pesquisa', NULL, now(), $$Oi, {nome}, tudo bem? Aqui é o [seu nome], sou desenvolvedor aqui de {cidade}.

Encontrei vocês pesquisando {categoria} na região e uma coisa me chamou atenção: {oportunidade}.

Acho que dá pra resolver isso com {servico}, de um jeito simples. Posso te mostrar uma ideia rápida de como ficaria pra {empresa}? Sem custo e sem compromisso.

Se não fizer sentido agora, sem problema!$$)
ON CONFLICT (id) DO NOTHING;
