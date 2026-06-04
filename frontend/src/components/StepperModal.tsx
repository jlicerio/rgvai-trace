import { X, StepForward } from 'lucide-react';
import type { ExecutionStepResult } from '../types/pipeline';

interface StepperModalProps {
  open: boolean;
  currentStep: number;
  totalSteps: number;
  stepResult: ExecutionStepResult | null;
  onContinue: () => void;
  onAbort: () => void;
  loading?: boolean;
}

function JsonViewer({ data, label }: { data: unknown; label: string }) {
  const formatted =
    typeof data === 'string'
      ? data
      : typeof data === 'object' && data !== null
        ? JSON.stringify(data, null, 2)
        : String(data ?? '');

  return (
    <div className="space-y-1.5">
      <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
        {label}
      </span>
      <pre className="text-gray-300 font-mono text-xs bg-gray-950 border border-gray-700 rounded-lg p-3 max-h-[220px] overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
        {formatted}
      </pre>
    </div>
  );
}

export default function StepperModal({
  open,
  currentStep,
  totalSteps,
  stepResult,
  onContinue,
  onAbort,
  loading = false,
}: StepperModalProps) {
  if (!open || !stepResult) return null;

  const isLastStep = currentStep + 1 >= totalSteps;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <StepForward size={16} className="text-indigo-400" />
              <span className="text-gray-100 text-sm font-semibold">
                Step Through Execution
              </span>
            </div>
            <span className="text-gray-500 text-xs">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <button
            onClick={onAbort}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-800"
            title="Abort and close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Step metadata */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Node Type:
            </span>
            <span className="text-xs font-mono bg-gray-800 text-indigo-300 px-2 py-0.5 rounded border border-gray-700 uppercase">
              {stepResult.nodeType}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Step ID:
            </span>
            <span className="text-xs font-mono text-gray-400">{stepResult.stepId}</span>
          </div>

          {/* Curl equivalent */}
          {stepResult.curl && (
            <div className="space-y-1.5">
              <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">
                Curl Equivalent
              </span>
              <pre className="text-green-400 font-mono text-xs bg-gray-950 border border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {stepResult.curl}
              </pre>
            </div>
          )}

          {/* Request payload */}
          <JsonViewer data={stepResult.request} label="Request Payload" />

          {/* Response or error */}
          {stepResult.error ? (
            <div className="space-y-1.5">
              <span className="text-red-400 text-xs font-medium uppercase tracking-wider">
                Error
              </span>
              <div className="text-red-300 text-xs bg-red-900/30 border border-red-800 rounded-lg p-3 leading-relaxed">
                {stepResult.error}
              </div>
            </div>
          ) : (
            <JsonViewer data={stepResult.response} label="Response" />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700 shrink-0">
          <button
            onClick={onAbort}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-red-400 border border-gray-700 transition-colors"
          >
            Abort
          </button>

          <button
            onClick={onContinue}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              loading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-400 shadow-md hover:shadow-lg'
            }`}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Executing…
              </>
            ) : isLastStep ? (
              'Finish'
            ) : (
              <>
                <StepForward size={14} />
                Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
