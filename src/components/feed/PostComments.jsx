import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Reply, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import AchievementBadge from "@/components/profile/AchievementBadge";
import MentionTextarea from "@/components/feed/MentionTextarea";
import MentionText from "@/components/feed/MentionText";

function extractMentions(content, profiles, authorEmail) {
  const matches = content.match(/@[\w.]+/g) || [];
  const usernameToEmail = new Map();
  for (const p of profiles) if (p.username) usernameToEmail.set(p.username.toLowerCase(), p.user_email);
  const emails = new Set();
  for (const m of matches) {
    const username = m.slice(1).toLowerCase();
    const email = usernameToEmail.get(username);
    if (email && email !== authorEmail) emails.add(email);
  }
  return [...emails];
}

function ReplyItem({ reply, userEmail, depth = 1, profiles = [] }) {
  const navigate = useNavigate();
  const timeAgo = reply.created_date
    ? formatDistanceToNow(new Date(reply.created_date), { addSuffix: true, locale: ptBR })
    : "";
  const replyProfile = profiles.find(p => p.user_email === reply.created_by);
  return (
    <div className={`flex gap-2.5 ${depth > 0 ? "ml-8 mt-2" : "mt-3"}`}>
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
        {reply.author_avatar
          ? <img src={reply.author_avatar} className="w-full h-full rounded-full object-cover" />
          : (reply.author_name || "A")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-secondary/60 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <button onClick={() => reply.created_by && navigate(`/u/${reply.created_by}`)}
              className="text-xs font-semibold text-foreground hover:text-primary transition-colors">
              {reply.author_name || "Anônimo"}
            </button>
            {replyProfile?.selected_badge_id && <AchievementBadge badgeId={replyProfile.selected_badge_id} size="xs" />}
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap"><MentionText content={reply.content} profiles={profiles} /></p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 ml-2">{timeAgo}</p>
      </div>
    </div>
  );
}

function CommentItem({ comment, userEmail, postId, allComments, profiles = [] }) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const commentProfile = profiles.find(p => p.user_email === comment.created_by);

  const replies = allComments.filter(c => c.parent_id === comment.id);

  const timeAgo = comment.created_date
    ? formatDistanceToNow(new Date(comment.created_date), { addSuffix: true, locale: ptBR })
    : "";

  const replyMutation = useMutation({
    mutationFn: async () => {
      const me = await base44.auth.me();
      const created = await base44.entities.Comment.create({
        post_id: postId,
        parent_id: comment.id,
        content: replyText.trim(),
        author_name: me.full_name || me.email,
      });
      return { created, me };
    },
    onSuccess: ({ created, me }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      const mentionedEmails = extractMentions(replyText, profiles, me.email);
      for (const email of mentionedEmails) {
        base44.entities.Notification.create({
          recipient_email: email,
          type: "mention",
          message: `${me.full_name || me.email} mencionou você em uma resposta`,
          from_name: me.full_name || "ZOKU",
          from_email: me.email,
          reference_id: created.id,
          is_read: false,
        }).catch(() => {});
      }
      setReplyText("");
      setShowReplyBox(false);
      setShowReplies(true);
    },
  });

  return (
    <div className="mt-3">
      <div className="flex gap-2.5">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
          {comment.author_avatar
            ? <img src={comment.author_avatar} className="w-full h-full rounded-full object-cover" />
            : (comment.author_name || "A")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-secondary/60 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <button onClick={() => comment.created_by && navigate(`/u/${comment.created_by}`)}
                className="text-xs font-semibold text-foreground hover:text-primary transition-colors">
                {comment.author_name || "Anônimo"}
              </button>
              {commentProfile?.selected_badge_id && <AchievementBadge badgeId={commentProfile.selected_badge_id} size="xs" />}
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap"><MentionText content={comment.content} profiles={profiles} /></p>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-2">
            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
            <button
              onClick={() => setShowReplyBox(!showReplyBox)}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 font-medium"
            >
              <Reply className="w-2.5 h-2.5" /> Responder
            </button>
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-[10px] text-primary/70 hover:text-primary transition-colors flex items-center gap-0.5 font-medium"
              >
                {showReplies ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                {replies.length} resposta{replies.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {showReplyBox && (
            <div className="mt-2 ml-1 flex gap-2">
              <MentionTextarea
                placeholder={`Responder ${comment.author_name}...`}
                value={replyText}
                onChange={setReplyText}
                profiles={profiles}
                currentEmail={userEmail}
                className="bg-secondary border-none text-xs resize-none h-14"
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="icon"
                  className="h-7 w-7 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!replyText.trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate()}
                >
                  <Send className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => setShowReplyBox(false)}
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          {showReplies && replies.map(reply => (
            <ReplyItem key={reply.id} reply={reply} userEmail={userEmail} profiles={profiles} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PostComments({ postId, userEmail, onCountUpdate }) {
  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();

  const { data: allComments, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId }, "-created_date", 100),
    initialData: [],
  });

  const { data: profiles } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: () => base44.entities.UserProfile.list("-created_date", 200),
    initialData: [],
    staleTime: 60000,
  });

  // Top-level comments only (no parent_id)
  const topLevel = allComments.filter(c => !c.parent_id);

  const createMutation = useMutation({
    mutationFn: async () => {
      const me = await base44.auth.me();
      const created = await base44.entities.Comment.create({
        post_id: postId,
        content: commentText.trim(),
        author_name: me.full_name || me.email,
      });
      return { created, me };
    },
    onSuccess: ({ created, me }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      base44.entities.Post.update(postId, { comments_count: topLevel.length + 1 }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      });
      const mentionedEmails = extractMentions(commentText, profiles, me.email);
      for (const email of mentionedEmails) {
        base44.entities.Notification.create({
          recipient_email: email,
          type: "mention",
          message: `${me.full_name || me.email} mencionou você em um comentário`,
          from_name: me.full_name || "ZOKU",
          from_email: me.email,
          reference_id: created.id,
          is_read: false,
        }).catch(() => {});
      }
      setCommentText("");
    },
  });

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {/* New comment input */}
      <div className="flex gap-2 mb-4">
        <MentionTextarea
          placeholder="Escreva um comentário... use @ para mencionar"
          value={commentText}
          onChange={setCommentText}
          profiles={profiles}
          currentEmail={userEmail}
          className="bg-secondary border-none text-sm resize-none h-16"
        />
        <Button
          size="icon"
          className="h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90 self-end shrink-0"
          disabled={!commentText.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-3">Carregando comentários...</p>
      ) : topLevel.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Sem comentários ainda. Seja o primeiro!</p>
      ) : (
        <div className="space-y-1">
          {topLevel.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              userEmail={userEmail}
              postId={postId}
              allComments={allComments}
              profiles={profiles}
            />
          ))}
        </div>
      )}
    </div>
  );
}