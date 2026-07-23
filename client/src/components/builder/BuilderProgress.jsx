import { ProgressBar } from '../ui/ProgressBar.jsx';

export function BuilderProgress({ progress }) {
  if (!progress) return null;
  const { currentStep, totalSteps, stepTitle, completionPercentage, isComplete } = progress;
  const shownStep = Math.min(currentStep, totalSteps);
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between text-[13px]">
        <span className="font-semibold text-ink">
          {isComplete ? 'Review your agent' : `Step ${shownStep} of ${totalSteps}`}
          {stepTitle && !isComplete && <span className="ml-2 font-normal text-ink-soft">· {stepTitle}</span>}
        </span>
        <span className="font-semibold text-primary">{completionPercentage}% complete</span>
      </div>
      <ProgressBar value={completionPercentage} />
    </div>
  );
}
