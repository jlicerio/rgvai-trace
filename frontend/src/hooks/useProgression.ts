import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { LESSONS, PHASES, type Lesson, type Objective } from '../constants/lessons';
import type { Node, Edge } from 'reactflow';

const PROGRESS_KEY = 'agentic-pipeline-progression-v1';

export interface ProgressionState {
  currentPhase: number;
  completedLessons: string[];
  activeLessonId: string | null;
  earnedBadges: string[];
}

const DEFAULT_STATE: ProgressionState = {
  currentPhase: 1,
  completedLessons: [],
  activeLessonId: 'lesson-1-hello-agent',
  earnedBadges: [],
};

export function useProgression() {
  const [state, setState] = useLocalStorage<ProgressionState>(PROGRESS_KEY, DEFAULT_STATE);
  const [objectivesStatus, setObjectivesStatus] = useState<Record<string, boolean>>({});

  const activeLesson = LESSONS.find((l) => l.id === state.activeLessonId) || LESSONS[0];

  // Helper to get all unlocked node types based on current phase
  const getUnlockedNodeTypes = useCallback((phase: number): string[] => {
    const types = ['provider', 'chat', 'observer']; // Phase 1
    if (phase >= 2) types.push('search');
    if (phase >= 3) { types.push('mcp'); types.push('memory'); } // lesson-6 Memory
    if (phase >= 4) { types.push('browser'); types.push('context'); types.push('skill'); } // lesson-7 Context, lesson-9 Skills
    if (phase >= 5) { types.push('registry'); types.push('thread'); types.push('subagent'); types.push('code_sandbox'); } // lesson-8 Threads, lesson-10 Subagent, lesson-12 Code Sandbox
    return types;
  }, []);

  const checkObjectives = useCallback(
    (nodes: Node[], edges: Edge[], executionCompleted: boolean) => {
      if (!activeLesson) return;

      const newStatus: Record<string, boolean> = {};

      activeLesson.objectives.forEach((obj) => {
        if (obj.type === 'node_exists') {
          newStatus[obj.id] = nodes.some((n) => n.data?.type === obj.targetType);
        } else if (obj.type === 'edge_exists') {
          newStatus[obj.id] = edges.some((e) => {
            const srcNode = nodes.find((n) => n.id === e.source);
            const tgtNode = nodes.find((n) => n.id === e.target);
            return (
              srcNode?.data?.type === obj.sourceType &&
              tgtNode?.data?.type === obj.targetType
            );
          });
        } else if (obj.type === 'execution_completed') {
          newStatus[obj.id] = executionCompleted;
        }
      });

      setObjectivesStatus(newStatus);

      // Check if all objectives are completed
      const allCompleted = activeLesson.objectives.every((obj) => newStatus[obj.id]);
      if (allCompleted && !state.completedLessons.includes(activeLesson.id)) {
        completeLesson(activeLesson.id);
      }
    },
    [activeLesson, state.completedLessons]
  );

  const completeLesson = useCallback(
    (lessonId: string) => {
      setState((prev) => {
        const completed = prev.completedLessons.includes(lessonId)
          ? prev.completedLessons
          : [...prev.completedLessons, lessonId];

        // Check if all lessons in current phase are complete
        const phaseLessons = LESSONS.filter((l) => l.phase === prev.currentPhase);
        const allPhaseLessonsDone = phaseLessons.every((l) => completed.includes(l.id));

        let nextPhase = prev.currentPhase;
        const badges = [...prev.earnedBadges];

        if (allPhaseLessonsDone) {
          const currentPhaseInfo = PHASES.find((p) => p.level === prev.currentPhase);
          if (currentPhaseInfo && !badges.includes(currentPhaseInfo.badge)) {
            badges.push(currentPhaseInfo.badge);
          }
          if (prev.currentPhase < 5) {
            nextPhase = prev.currentPhase + 1;
          }
        }

        // Find next incomplete lesson
        const nextIncomplete = LESSONS.find((l) => !completed.includes(l.id));
        const activeId = nextIncomplete ? nextIncomplete.id : null;

        return {
          ...prev,
          completedLessons: completed,
          currentPhase: nextPhase,
          activeLessonId: activeId || prev.activeLessonId,
          earnedBadges: badges,
        };
      });
    },
    [setState]
  );

  const startLesson = useCallback(
    (lessonId: string) => {
      setState((prev) => ({
        ...prev,
        activeLessonId: lessonId,
      }));
      setObjectivesStatus({});
    },
    [setState]
  );

  const resetProgression = useCallback(() => {
    setState(DEFAULT_STATE);
    setObjectivesStatus({});
  }, [setState]);

  const unlockedNodes = getUnlockedNodeTypes(state.currentPhase);

  return {
    currentPhase: state.currentPhase,
    completedLessons: state.completedLessons,
    activeLessonId: state.activeLessonId,
    earnedBadges: state.earnedBadges,
    activeLesson,
    objectivesStatus,
    unlockedNodes,
    checkObjectives,
    startLesson,
    resetProgression,
  };
}
