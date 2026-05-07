// Maps achievement icon names to actual Lucide components
import {
  Play, Tv, Clapperboard, Flame, Zap, Crown,
  BookOpen, Book, BookMarked, Library, Scroll,
  Film, Popcorn, Video,
  CheckCircle, ListChecks, Medal, Award, Trophy,
  FolderOpen, Database, Archive, LayoutList, Scale, Layers,
  PlayCircle, ShieldCheck, CalendarPlus, MoveRight,
  MessageSquare, MessageSquarePlus, Megaphone, Radio,
  MessageCircle, MessagesSquare, Lightbulb, Star,
  Heart, HeartHandshake, TrendingUp,
  Users, UserPlus, Building2, UsersRound, Globe,
  UserCheck, Users2, Network,
  Calendar, Tv2, BookCopy, CalendarCheck,
  Swords, CalendarRange,
  UserCircle, Bookmark, BookmarkCheck,
  Shield, Tickets,
} from "lucide-react";

// Note: ShieldStar doesn't exist in lucide-react, use Shield instead
export const ACHIEVEMENT_ICONS = {
  Play, Tv, Clapperboard, Flame, Zap, Crown,
  BookOpen, Book, BookMarked, Library, Scroll,
  Film, Popcorn, Video,
  CheckCircle, ListChecks, Medal, Award, Trophy,
  FolderOpen, Database, Archive, LayoutList, Scale, Layers,
  PlayCircle, ShieldCheck, CalendarPlus, MoveRight,
  MessageSquare, MessageSquarePlus, Megaphone, Radio,
  MessageCircle, MessagesSquare, Lightbulb, Star,
  Heart, HeartHandshake, TrendingUp,
  Users, UserPlus, Building2, UsersRound, Globe,
  UserCheck, Users2, Network,
  Calendar, Tv2, BookCopy, CalendarCheck,
  Swords, CalendarRange,
  UserCircle, Bookmark, BookmarkCheck,
  ShieldStar: Shield, // fallback
  Tickets,
  Speech: MessageCircle, // fallback
};

export function getAchievementIcon(iconName) {
  return ACHIEVEMENT_ICONS[iconName] || Star;
}