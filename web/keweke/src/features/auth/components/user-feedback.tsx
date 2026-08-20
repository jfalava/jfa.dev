import type { DialogFeedback, FeedbackSection } from "@/features/auth/hooks/use-user-manager";

export function FeedbackMessage({
  feedback,
  section,
}: {
  feedback?: DialogFeedback;
  section: FeedbackSection;
}) {
  if (feedback?.section !== section) {
    return null;
  }

  return (
    <p
      className={
        feedback.tone === "error"
          ? "mt-2 text-sm font-medium text-destructive"
          : "mt-2 text-sm font-medium text-primary"
      }
    >
      {feedback.text}
    </p>
  );
}
