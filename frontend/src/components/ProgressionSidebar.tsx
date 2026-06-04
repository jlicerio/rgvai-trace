import React, { useState } from 'react';
import { Award, CheckCircle, Circle, HelpCircle, RefreshCw, ChevronRight, Lock } from 'lucide-react';
import { LESSONS, PHASES, type Lesson } from '../constants/lessons';

interface ProgressionSidebarProps {
  currentPhase: number;
  completedLessons: string[];
  activeLesson: Lesson;
  objectivesStatus: Record<string, boolean>;
  earnedBadges: string[];
  onStartLesson: (id: string) => void;
  onResetProgression: () => void;
  onLoadInitialState: (lesson: Lesson) => void;
}

export default function ProgressionSidebar({
  currentPhase,
  completedLessons,
  activeLesson,
  objectivesStatus,
  earnedBadges,
  onStartLesson,
  onResetProgression,
  onLoadInitialState,
}: ProgressionSidebarProps) {
  const [showHint, setShowHint] = useState(false);

  // Group lessons by phase
  const phasesList = PHASES.map((phase) => {
    const phaseLessons = LESSONS.filter((l) => l.phase === phase.level);
    const isUnlocked = phase.level <= currentPhase;
    return {
      ...phase,
      lessons: phaseLessons,
      isUnlocked,
    };
  });

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 w-64 shrink-0 text-gray-200">
      {/* Current Rank Badge */}
      <div className="p-4 border-b border-gray-800 bg-gray-950/40 flex flex-col items-center text-center">
        <Award size={36} className="text-gray-400 mb-2 animate-bounce" />
        <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">Active Achievement</span>
        <h3 className="text-sm font-bold text-gray-200">
          {PHASES.find((p) => p.level === currentPhase)?.title || 'Prompt Engineer'}
        </h3>
        <p className="text-[11px] text-gray-400 mt-1">Phase {currentPhase} of 5 Unlocked</p>

        {earnedBadges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {earnedBadges.map((badge) => (
              <span
                key={badge}
                className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-gray-800 text-gray-400 border border-gray-700"
              >
                🏅 {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Curriculum list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
            Lesson Path
          </h4>
          <div className="space-y-3">
            {phasesList.map((phase) => (
              <div key={phase.level} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                  <span className="flex items-center gap-1">
                    {!phase.isUnlocked && <Lock size={12} className="text-gray-600" />}
                    Phase {phase.level}: {phase.title}
                  </span>
                </div>
                <div className="pl-3 border-l border-gray-800 space-y-1">
                  {phase.lessons.map((lesson) => {
                    const isCompleted = completedLessons.includes(lesson.id);
                    const isActive = lesson.id === activeLesson.id;
                    const canSelect = phase.isUnlocked;

                    return (
                      <button
                        key={lesson.id}
                        disabled={!canSelect}
                        onClick={() => onStartLesson(lesson.id)}
                        className={`w-full text-left flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                          isActive
                            ? 'bg-gray-800 text-gray-100 font-medium border border-gray-700'
                            : canSelect
                            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                            : 'text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        <span className="truncate pr-2">{lesson.title}</span>
                        {isCompleted ? (
                          <CheckCircle size={12} className="text-gray-500 shrink-0" />
                        ) : (
                          <Circle size={12} className="text-gray-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Lesson Detail */}
        {activeLesson && (
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-800 text-gray-300">
                  {activeLesson.difficulty}
                </span>
                <button
                  onClick={() => onLoadInitialState(activeLesson)}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-200 hover:underline"
                  title="Reset canvas to this lesson's template"
                >
                  <RefreshCw size={11} /> Load Template
                </button>
              </div>
              <h3 className="text-sm font-bold text-gray-100 mt-2">{activeLesson.title}</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{activeLesson.description}</p>
            </div>

            {/* Objectives */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Objectives
              </span>
              <div className="space-y-1.5">
                {activeLesson.objectives.map((obj) => {
                  const isDone = objectivesStatus[obj.id] || false;
                  return (
                    <div key={obj.id} className="flex items-start gap-2 text-xs">
                      {isDone ? (
                        <CheckCircle size={14} className="text-gray-500 mt-0.5 shrink-0" />
                      ) : (
                        <Circle size={14} className="text-gray-500 mt-0.5 shrink-0" />
                      )}
                      <span className={isDone ? 'text-gray-500 line-through' : 'text-gray-300'}>
                        {obj.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hint Box */}
            <div>
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 focus:outline-none"
              >
                <HelpCircle size={13} />
                {showHint ? 'Hide Hint' : 'Show Hint'}
              </button>
              {showHint && (
                <div className="mt-2 bg-gray-950/40 border border-gray-700 rounded p-2.5 text-xs text-gray-200 leading-relaxed font-mono">
                  {activeLesson.hints[0]}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Reset */}
      <div className="p-4 border-t border-gray-800 bg-gray-950/20">
        <button
          onClick={onResetProgression}
          className="w-full py-1.5 px-3 rounded text-[11px] font-medium text-red-400 border border-red-950 bg-red-950/10 hover:bg-red-950/30 hover:border-red-900 transition-colors"
        >
          Reset Curriculum Progress
        </button>
      </div>
    </div>
  );
}
