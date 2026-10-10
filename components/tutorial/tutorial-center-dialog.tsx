'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlanButton } from '@/components/ui/plan-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTutorial } from '@/lib/tutorial/tutorial-context';
import { TIMETABLE_PRO_MODULES } from '@/lib/tutorial/tutorial-modules';
import {
  Search,
  Sparkles,
  Compass,
  RotateCcw,
  BookOpen,
  LayoutDashboard,
  LayoutGrid,
  GraduationCap,
  Users,
  DoorOpen,
  Table2,
  ClipboardList,
  UserCheck,
  BookMarked,
  FileText,
  Settings,
  CreditCard,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  HelpCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  LayoutGrid,
  Sparkles,
  GraduationCap,
  BookOpen,
  Users,
  DoorOpen,
  Table2,
  ClipboardList,
  UserCheck,
  BookMarked,
  FileText,
  Settings,
  CreditCard,
};

export function TutorialCenterDialog() {
  const router = useRouter();
  const {
    isHelpCenterOpen,
    closeHelpCenter,
    startTour,
    restartTutorial,
    openWelcomeModal,
    jumpToModuleTour,
    state,
  } = useTutorial();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedModuleKey, setExpandedModuleKey] = useState<string | null>(null);

  const categories = ['All', 'Foundation', 'Academic Setup', 'Scheduling & Operations', 'Academic Monitoring', 'System & Billing'];

  const filteredModules = useMemo(() => {
    return TIMETABLE_PRO_MODULES.filter((m) => {
      const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.purpose.toLowerCase().includes(q) ||
        m.primaryAction.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const handleLaunchModuleTour = (moduleKey: string) => {
    closeHelpCenter();
    jumpToModuleTour(moduleKey);
  };

  const handleNavigateToModule = (route: string) => {
    closeHelpCenter();
    router.push(route);
  };

  return (
    <Dialog open={isHelpCenterOpen} onOpenChange={(open) => !open && closeHelpCenter()}>
      <DialogContent className="w-[95vw] sm:max-w-[780px] max-h-[92vh] sm:max-h-[88vh] p-0 overflow-hidden rounded-2xl sm:rounded-3xl border-border/80 bg-background/98 backdrop-blur-2xl shadow-2xl flex flex-col">
        {/* Header Section */}
        <div className="p-3.5 sm:p-6 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-8.5 w-8.5 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs shrink-0">
                <HelpCircle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-lg font-black tracking-tight text-foreground flex items-center gap-1.5 sm:gap-2 truncate sm:whitespace-normal">
                  Tutorial & Knowledge Center
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                  Explore how every module works or take a guided interactive walk-through.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {state.isCompleted ? (
                <Badge variant="outline" className="text-[10px] sm:text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 py-0.5 sm:py-1 px-2 sm:px-2.5">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="hidden xs:inline">Tour Completed</span>
                  <span className="xs:hidden">Done</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] sm:text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 gap-1 py-0.5 sm:py-1 px-2 sm:px-2.5">
                  <Sparkles className="h-3 w-3" />
                  <span>Self-Guided</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Top Quick Actions Bar */}
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2.5">
            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              <PlanButton
                variant="primary"
                size="sm"
                onClick={() => {
                  closeHelpCenter();
                  startTour(0);
                }}
                className="w-full sm:w-auto rounded-xl text-xs font-bold gap-1.5 shadow-md shadow-indigo-500/20 py-2 sm:py-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Start Full Tour
              </PlanButton>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  closeHelpCenter();
                  openWelcomeModal();
                }}
                className="w-full sm:w-auto rounded-xl text-xs font-semibold gap-1.5 py-2 sm:py-1.5 truncate"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden xs:inline sm:inline">Restart Onboarding</span>
                <span className="xs:hidden sm:hidden">Restart</span>
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules & tools..."
                className="h-9 pl-9 text-xs rounded-xl bg-background/80 w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-2.5 sm:px-3 py-1 rounded-full text-[10.5px] sm:text-[11px] font-semibold whitespace-nowrap transition-all shrink-0',
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Modules List */}
        <ScrollArea className="flex-1 p-3.5 sm:p-6">
          <div className="space-y-3">
            {filteredModules.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Compass className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs font-semibold text-muted-foreground">No matching modules found</p>
                <p className="text-[11px] text-muted-foreground/70">Try searching for keywords like classes, timetable, or attendance.</p>
              </div>
            ) : (
              filteredModules.map((module) => {
                const IconComponent = ICON_MAP[module.iconName] || BookOpen;
                const isExpanded = expandedModuleKey === module.key;

                return (
                  <div
                    key={module.key}
                    className={cn(
                      'rounded-2xl border transition-all duration-200 overflow-hidden',
                      isExpanded
                        ? 'border-indigo-500/50 bg-indigo-500/[0.02] shadow-sm'
                        : 'border-border/60 bg-card hover:border-border hover:bg-muted/20'
                    )}
                  >
                    {/* Module Card Header */}
                    <div
                      onClick={() => setExpandedModuleKey(isExpanded ? null : module.key)}
                      className="p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
                            <h4 className="text-xs font-bold text-foreground truncate">{module.name}</h4>
                            <Badge variant="secondary" className="text-[8.5px] sm:text-[9px] font-semibold uppercase px-1.5 py-0">
                              {module.category}
                            </Badge>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{module.tagline}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLaunchModuleTour(module.key);
                          }}
                          className="h-7 px-2 text-[10.5px] sm:text-[11px] font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                        >
                          <Sparkles className="h-3 w-3 sm:mr-1 shrink-0" />
                          <span className="hidden xs:inline sm:inline">Tour Module</span>
                          <span className="xs:hidden sm:hidden">Tour</span>
                        </Button>
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform duration-200',
                            isExpanded && 'rotate-90'
                          )}
                        />
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="px-3 sm:px-4 pb-3.5 sm:pb-4 pt-1.5 border-t border-border/40 space-y-3 sm:space-y-3.5 text-xs bg-muted/10">
                        <div className="space-y-1">
                          <span className="font-bold text-[10.5px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">
                            What it is used for
                          </span>
                          <p className="text-foreground leading-relaxed text-[11.5px] sm:text-[12px]">{module.purpose}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                          <div className="space-y-1">
                            <span className="font-bold text-[10.5px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">
                              Where to find it
                            </span>
                            <p className="text-foreground text-[11px]">{module.whereToFind}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-[10.5px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">
                              Primary Action
                            </span>
                            <p className="text-foreground text-[11px] font-medium">{module.primaryAction}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-[10.5px] sm:text-[11px] text-muted-foreground uppercase tracking-wider">
                            Key Controls & Tools
                          </span>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10.5px] sm:text-[11px] text-muted-foreground">
                            {module.importantControls.map((ctrl, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                                <span className="truncate">{ctrl}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Pro Tip */}
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[10.5px] sm:text-[11px]">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Pro Tip: </span>
                            {module.proTip}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleNavigateToModule(module.route)}
                            className="w-full sm:w-auto rounded-xl text-xs font-semibold"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Open Module
                          </Button>

                          <PlanButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleLaunchModuleTour(module.key)}
                            className="w-full sm:w-auto rounded-xl text-xs font-bold gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            Take Module Tour
                            <ArrowRight className="h-3 w-3 ml-0.5" />
                          </PlanButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
