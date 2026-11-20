-- Templates use the profile instead of a placeholder: [seu nome] -> {meu_nome},
-- "sou desenvolvedor" -> "sou {minha_profissao}". Other text is untouched.
UPDATE "MessageTemplate"
SET body = replace(replace(body, '[seu nome]', '{meu_nome}'), 'sou desenvolvedor', 'sou {minha_profissao}'),
    "updatedAt" = now()
WHERE body LIKE '%[seu nome]%' OR body LIKE '%sou desenvolvedor%';
