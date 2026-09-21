ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_content_not_blank
  CHECK (btrim(content) <> '');

ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_content_max_length
  CHECK (char_length(content) <= 3000);