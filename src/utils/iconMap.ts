import {
  Activity, AlertCircle, AlertTriangle, ArrowDownCircle, ArrowLeft, ArrowLeftRight, ArrowUpCircle,
// @ts-ignore TS6133: Bookmark is declared but never read
  BadgeCheck, Ban, Banknote, BarChart3, Bookmark, Building2,
  Calendar, CalendarCheck, Camera, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, ClipboardPen, Clock, Construction, CreditCard,
  Database, DollarSign, Download, Droplets,
  Edit3, Eye, EyeOff,
  File, FileJson, FileSpreadsheet, FileText, Filter, FolderKanban, FolderOpen,
  Globe,
  HardHat, HelpCircle, Home,
  Image, Inbox, Info,
  Key,
  Landmark, LayoutDashboard, Lightbulb, Loader, Loader2, Lock, LogOut,
  Mail, MapPin, Menu, Monitor, Moon, MoreVertical,
  Package, PaintBucket, Paperclip, Phone, PieChart, Plus, Printer,
  Receipt, Redo, RefreshCw, RotateCcw, Ruler,
  Save, ScrollText, Search, Settings, Shield, Snowflake, Sparkles, Stamp, Sun,
  Trash2, TrendingDown, TrendingUp, Truck,
  Undo, Upload, UserCheck, UserCircle, UserCog, Users,
  Wallet, WifiOff, Wrench,
  X, XCircle, Zap,
  type LucideIcon,
} from 'lucide-react'

export const iconMap: Record<string, LucideIcon> = {
  Activity, AlertCircle, AlertTriangle, ArrowDownCircle, ArrowLeft, ArrowLeftRight, ArrowUpCircle,
  BadgeCheck, Ban, Banknote, BarChart3, Building2,
  Calendar, CalendarCheck, Camera, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardFile: ClipboardPen, ClipboardList, ClipboardPen, Clock, Construction, CreditCard,
  Database, DollarSign, Download, Droplets,
  Edit: Edit3, Edit3, Eye, EyeOff,
  File, FileJson, FileSpreadsheet, FileText, Filter, FolderKanban, FolderOpen,
  Globe,
  HardHat, HelpCircle, Home,
  Image, Inbox, Info,
  Key,
  Landmark, LayoutDashboard, Lightbulb, Loader, Loader2, Lock, LogOut,
  Mail, MapPin, Menu, Monitor, Moon, MoreVertical,
  Package, PaintBucket, Palette: PaintBucket, Paperclip, Phone, PieChart, Plus, Printer,
  Receipt, Redo, RefreshCw, RotateCcw, Ruler,
  Save, ScrollText, Search, Settings, Shield, Snowflake, Sparkles, Stamp, Sun,
  Trash2, TrendingDown, TrendingUp, Truck,
  Undo, Upload, UserCheck, UserCircle, UserCog, Users,
  Wallet, WifiOff, Wrench,
  X, XCircle, Zap,
}

export function getIcon(name: string): LucideIcon | undefined {
  return iconMap[name]
}
