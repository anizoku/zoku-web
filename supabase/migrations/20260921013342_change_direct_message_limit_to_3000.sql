ALTER TABLE public.direct_messages
  DROP CONSTRAINT IF EXISTS direct_messages_content_max_length;

ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_content_max_length
  CHECK (char_length(content) <= 3000);