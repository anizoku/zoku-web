DROP POLICY IF EXISTS direct_messages_insert
ON public.direct_messages;

CREATE POLICY direct_messages_insert
ON public.direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND receiver_id <> auth.uid()
  AND public.are_friends(receiver_id)
);