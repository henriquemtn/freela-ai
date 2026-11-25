-- Shorter "offer a preview" first-contact message (data only).
UPDATE "MessageTemplate" SET body = $tpl$Oi, tudo bem? Aqui é o {meu_nome}, {minha_profissao} aqui de {cidade}.

Estava pesquisando {categoria} na região e vi que vocês ainda não têm site. Então quem procura vocês no Google não encontra num lugar só o que oferecem, horários e endereço.

Posso montar uma prévia de um site simples pra {empresa} com essas informações? Sem custo e sem compromisso.$tpl$
WHERE id = 'tpl_no_site_offer';
