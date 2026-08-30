import { Button } from "@jfa.dev/common/ui";
import { toast } from "sonner";

import { Card, Preview } from "@/components/preview";
import { Section } from "@/components/section";

export function SonnerSection() {
  return (
    <Section
      description="Sonner toaster (common/ui/Toaster). Theme-aware via the header toggle. Try each toast variant."
      id="sonner"
      title="Toaster"
    >
      <Card>
        <Preview label="toast variants">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onPress={() => toast("Heads up — plain toast.")}>
              Default
            </Button>
            <Button variant="outline" onPress={() => toast.success("Saved successfully.")}>
              Success
            </Button>
            <Button variant="outline" onPress={() => toast.error("Something went wrong.")}>
              Error
            </Button>
            <Button variant="outline" onPress={() => toast.info("FYI — new version available.")}>
              Info
            </Button>
            <Button variant="outline" onPress={() => toast.warning("Check your input.")}>
              Warning
            </Button>
            <Button
              variant="outline"
              onPress={() =>
                toast.promise(new Promise((resolve) => setTimeout(resolve, 1200)), {
                  loading: "Saving…",
                  success: "Saved!",
                  error: "Failed",
                })
              }
            >
              Promise
            </Button>
          </div>
        </Preview>
        <Preview label="with description & action">
          <Button
            variant="secondary"
            onPress={() =>
              toast("Event created", {
                description: "Sunday · 10:30 AM",
                action: { label: "Undo", onClick: () => toast("Undone") },
              })
            }
          >
            With action
          </Button>
        </Preview>
      </Card>
    </Section>
  );
}
