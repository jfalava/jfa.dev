import { Button } from "@jfa.dev/common/ui";
import { toast } from "sonner";

import { Row, Specimen } from "@/components/preview";
import { Section } from "@/components/section";

export function SonnerSection() {
  return (
    <Section
      description="Sonner toaster from common/ui. Follows the header theme."
      id="sonner"
      title="Toaster"
    >
      <Specimen label="Variants">
        <Row>
          <Button variant="outline" onPress={() => toast("List published.")}>
            Default
          </Button>
          <Button variant="outline" onPress={() => toast.success("Saved Weekend groceries.")}>
            Success
          </Button>
          <Button
            variant="outline"
            onPress={() => toast.error("Could not save the list title right now.")}
          >
            Error
          </Button>
          <Button variant="outline" onPress={() => toast.info("This list no longer exists.")}>
            Info
          </Button>
          <Button variant="outline" onPress={() => toast.warning("Title can't be empty.")}>
            Warning
          </Button>
          <Button
            variant="outline"
            onPress={() =>
              toast.promise(new Promise((resolve) => setTimeout(resolve, 1200)), {
                loading: "Saving list…",
                success: "Saved Weekend groceries.",
                error: "Could not save.",
              })
            }
          >
            Promise
          </Button>
        </Row>
      </Specimen>
      <Specimen label="With action">
        <Row>
          <Button
            variant="secondary"
            onPress={() =>
              toast("Item removed", {
                description: "Oat milk",
                action: { label: "Undo", onClick: () => toast("Oat milk restored.") },
              })
            }
          >
            With undo
          </Button>
        </Row>
      </Specimen>
    </Section>
  );
}
