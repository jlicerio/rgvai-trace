import { Play, Loader2 } from 'lucide-react';

interface PlayButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}

export default function PlayButton({
  onClick,
  loading,
  disabled,
}: PlayButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ' +
        (loading || disabled
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-gray-700 text-gray-100 hover:bg-gray-600 active:bg-gray-500 shadow-md hover:shadow-lg')
      }
      title="Run Pipeline"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin text-gray-300" />
      ) : (
        <Play size={16} className="fill-gray-100 text-gray-100" />
      )}
      {loading ? 'Running…' : '▶ Run Pipeline'}
    </button>
  );
}
